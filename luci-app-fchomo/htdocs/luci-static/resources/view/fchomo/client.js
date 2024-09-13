'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

'require fchomo as hm';

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
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = ('N' + UIEl.getValue()).replace(/^[^#]+/, value);

			UIEl.node.previousElementSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.validate = function(section_id, value) {
			if (value.match('#'))
				return _('Expecting: %s').format(_('No add\'l params'));

			return true;
		}
		so.rmempty = false;
		so.modalonly = true;

		so = ss.option(form.ListValue, 'detour', _('Detour'));
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
		/* DNS END */

		return m.render();
	}
});
