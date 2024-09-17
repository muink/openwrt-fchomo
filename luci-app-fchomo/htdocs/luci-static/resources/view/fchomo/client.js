'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

'require fchomo as hm';

function loadDNSServerLabel(self, uciconfig, ucisection) {
	delete self.keylist;
	delete self.vallist;

	self.value('default-dns', _('Default DNS (114)'));
	self.value('system-dns', _('System DNS'));
	self.value('block-dns', _('Block DNS queries'));
	uci.sections(uciconfig, 'dns_server', (res) => {
		if (res.enabled !== '0')
			self.value(res['.name'], res.label);
	});

	return self.super('load', ucisection);
}
function validateNameserver(section_id, value) {
	const arr = value.trim().split(' ');
	if (arr.length > 1 && arr.includes('block-dns'))
		return _('Expecting: %s').format(_('If Block is selected, uncheck others'));

	return true;
}

class DNSAddress {
	constructor(address) {
		this.rawaddr = address || '';
		[this.addr, this.rawparams] = this.rawaddr.split('#');
		if (this.rawparams) {
			if (this.rawparams.match(/^[^=&]+(&|$)/))
				this.rawparams = 'detour=' + this.rawparams
		} else
			this.rawparams = '';
		this.params = new URLSearchParams(this.rawparams);
	}

	parseParam(param) {
		return this.params.has(param) ? decodeURI(this.params.get(param)) : null;
	}

	setParam(param, value) {
		if (value) {
			this.params.set(param, value);
		} else
			this.params.delete(param);

		return this
	}

	toString() {
		return this.addr + (this.params.size === 0 ? '' : '#' +
			['detour', 'h3', 'ecs', 'ecs-override'].map((k) => {
				return this.params.has(k) ? '%s=%s'.format(k, encodeURI(this.params.get(k))) : null;
			}).filter(v => v).join('&').replace(/^detour=/, '')
		);
	}
}

function strToFlag(string) {
	if (!string)
		return null;

	switch(string) {
	case 'true':
		return '1';
	case 'false':
		return '0';
	default:
		return null;
	}
}
function flagToStr(flag) {
	if (!flag)
		return null;

	switch(flag) {
	case '1':
		return 'true';
	default:
		return null;
	}
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo')
		]);
	},

	render: function(data) {
		var m, s, o, ss, so;

		m = new form.Map('fchomo', _('Mihomo client'));

		s = m.section(form.NamedSection, 'client', 'fchomo');

		/* DNS START */
		/* DNS settings */
		s.tab('dns', _('DNS settings'));

		o = s.taboption('dns', form.SectionValue, '_dns', form.NamedSection, 'dns', 'fchomo', null);
		ss = o.subsection;

		so = ss.option(form.Value, 'port', _('Listen port'));
		so.datatype = 'port'
		so.placeholder = '7753';
		so.rmempty = false;

		so = ss.option(form.Flag, 'ipv6', _('IPv6 support'));
		so.default = so.enabled;

		so = ss.option(form.MultiValue, 'boot_server', _('Boot DNS server'),
			_('Used to resolve the domain of the DNS server. Must be IP.'));
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'bootnode_server', _('Boot DNS server (node)'),
			_('Used to resolve the domain of the Proxy node.'));
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'default_server', _('Default DNS server'));
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'fallback_server', _('Fallback DNS server'));
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);

		/* DNS server */
		s.tab('dns_server', _('DNS server'));
		o = s.taboption('dns_server', form.SectionValue, '_dns_server', form.GridSection, 'dns_server', null);
		ss = o.subsection;
		var prefmt = { 'prefix': 'dns_', 'suffix': '' };
		ss.addremove = true;
		ss.rowcolors = true;
		ss.sortable = true;
		ss.nodescriptions = true;
		ss.modaltitle = L.bind(hm.loadModalTitle, this, _('DNS server'), _('Add a DNS server'), data[0]);
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, this, data[0]);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, this, ss, prefmt, true);
		ss.handleAdd = L.bind(hm.handleAdd, this, ss, prefmt);

		so = ss.option(form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, this, data[0]);
		so.validate = L.bind(hm.validateUniqueValue, this, data[0], 'dns_server', 'label');
		so.modalonly = true;

		so = ss.option(form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.option(form.DummyValue, 'address', _('Address'));
		so.write = function(/* ... */) {
			return form.AbstractValue.prototype.write.apply(this, arguments);
		}
		so.remove = function(/* ... */) {
			return form.AbstractValue.prototype.remove.apply(this, arguments);
		}

		so = ss.option(form.Value, 'addr', _('Address'));
		so.load = function(section_id) {
			return new DNSAddress(uci.get(data[0], section_id, 'address')).addr;
		}
		so.validate = function(section_id, value) {
			if (value.match('#'))
				return _('Expecting: %s').format(_('No add\'l params'));

			return true;
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = ('N' + UIEl.getValue()).replace(/^[^#]+/, value);

			UIEl.node.previousElementSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.rmempty = false;
		so.modalonly = true;

		so = ss.option(form.ListValue, 'detour', _('Proxy group'));
		so.load = function(section_id) {
			delete this.keylist;
			delete this.vallist;

			this.value('', _('RULES'));
			this.value('DIRECT', _('DIRECT'));
			uci.sections(data[0], 'proxy_group', (res) => {
				if (res.enabled !== '0')
					this.value(res['.name'], res.label);
			});

			return new DNSAddress(uci.get(data[0], section_id, 'address')).parseParam('detour');
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = new DNSAddress(UIEl.getValue()).setParam('detour', value).toString();

			UIEl.node.previousElementSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.modalonly = true;

		so = ss.option(form.Flag, 'h3', _('HTTP/3'));
		so.default = so.disabled;
		so.load = function(section_id) {
			return strToFlag(new DNSAddress(uci.get(data[0], section_id, 'address')).parseParam('h3'));
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = new DNSAddress(UIEl.getValue()).setParam('h3', flagToStr(value)).toString();

			UIEl.node.previousElementSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.modalonly = true;

		so = ss.option(form.Value, 'ecs', _('EDNS Client Subnet'));
		so.datatype = 'cidr';
		so.load = function(section_id) {
			return new DNSAddress(uci.get(data[0], section_id, 'address')).parseParam('ecs');
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = new DNSAddress(UIEl.getValue()).setParam('ecs', value).toString();

			UIEl.node.previousElementSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.modalonly = true;

		so = ss.option(form.Flag, 'ecs-override', _('ECS override'),
			_('Override ECS in original request.'));
		so.default = so.disabled;
		so.load = function(section_id) {
			return strToFlag(new DNSAddress(uci.get(data[0], section_id, 'address')).parseParam('ecs-override'));
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = new DNSAddress(UIEl.getValue()).setParam('ecs-override', flagToStr(value)).toString();

			UIEl.node.previousElementSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.depends({'ecs': /.+/});
		so.modalonly = true;

		/* DNS policy */
		/* Fallback filter */
		/* DNS END */

		return m.render();
	}
});
