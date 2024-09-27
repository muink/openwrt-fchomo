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

		/* DNS settings START */
		s.tab('dns', _('DNS settings'));

		/* DNS settings */
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

		so = ss.option(form.MultiValue, 'bootnode_server', _('Boot DNS server (Node)'),
			_('Used to resolve the domain of the Proxy node.'));
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'default_server', _('Default DNS server'));
		so.description = uci.get(data[0], so.section.section, 'fallback_server') ? _('Final DNS server (Used to Domestic-IP response)') : _('Final DNS server');
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'fallback_server', _('Fallback DNS server'));
		so.description = uci.get(data[0], so.section.section, 'fallback_server') ? _('Final DNS server (Used to Overseas-IP response)') : _('Fallback DNS server');
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.onchange = function(ev, section_id, value) {
			var ddesc = this.section.getUIElement(section_id, 'default_server').node.nextSibling;
			var fdesc = ev.target.nextSibling;
			if (value.length > 0) {
				ddesc.innerHTML = _('Final DNS server (Used to Domestic-IP response)');
				fdesc.innerHTML = _('Final DNS server (Used to Overseas-IP response)');
			} else {
				ddesc.innerHTML = _('Final DNS server');
				fdesc.innerHTML = _('Fallback DNS server');
			}
		}
		/* DNS settings END */

		/* DNS server START */
		s.tab('dns_server', _('DNS server'));

		/* DNS server */
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
		so.editable = true;

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

			UIEl.node.previousSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.rmempty = false;
		so.modalonly = true;

		so = ss.option(form.ListValue, 'detour', _('Proxy group'));
		so.load = function(section_id) {
			var preadds = [
				['', _('RULES')],
				['DIRECT', _('DIRECT')]
			];

			hm.loadProxyGroupLabel(this, preadds, data[0], section_id);

			return new DNSAddress(uci.get(data[0], section_id, 'address')).parseParam('detour');
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = new DNSAddress(UIEl.getValue()).setParam('detour', value).toString();

			UIEl.node.previousSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.editable = true;

		so = ss.option(form.Flag, 'h3', _('HTTP/3'));
		so.default = so.disabled;
		so.load = function(section_id) {
			return strToFlag(new DNSAddress(uci.get(data[0], section_id, 'address')).parseParam('h3'));
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'address');

			var newvalue = new DNSAddress(UIEl.getValue()).setParam('h3', flagToStr(value)).toString();

			UIEl.node.previousSibling.innerText = newvalue;
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

			UIEl.node.previousSibling.innerText = newvalue;
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

			UIEl.node.previousSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.depends({'ecs': /.+/});
		so.modalonly = true;
		/* DNS server END */

		/* DNS policy START */
		s.tab('dns_policy', _('DNS policy'));

		/* DNS policy */
		o = s.taboption('dns_policy', form.SectionValue, '_dns_policy', form.GridSection, 'dns_policy', null);
		ss = o.subsection;
		var prefmt = { 'prefix': '', 'suffix': '_domain' };
		ss.addremove = true;
		ss.rowcolors = true;
		ss.sortable = true;
		ss.nodescriptions = true;
		ss.modaltitle = L.bind(hm.loadModalTitle, this, _('DNS policy'), _('Add a DNS policy'), data[0]);
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, this, data[0]);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, this, ss, prefmt, false);
		ss.handleAdd = L.bind(hm.handleAdd, this, ss, prefmt);

		so = ss.option(form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, this, data[0]);
		so.validate = L.bind(hm.validateUniqueValue, this, data[0], 'dns_policy', 'label');
		so.modalonly = true;

		so = ss.option(form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.option(form.ListValue, 'type', _('Type'));
		so.value('domain', _('Domain'));
		so.value('geosite', _('Geosite'));
		so.value('rule_set', _('Rule set'));
		so.default = 'domain';

		so = ss.option(form.DynamicList, 'domain', _('Domain'),
			_('Match domain. Support wildcards.'));
		so.depends('type', 'domain');
		so.modalonly = true;

		so = ss.option(form.DynamicList, 'geosite', _('Geosite'),
			_('Match geosite.'));
		so.depends('type', 'geosite');
		so.modalonly = true;

		so = ss.option(form.MultiValue, 'rule_set', _('Rule set'),
			_('Match rule set.'));
		so.value('');
		so.load = L.bind(hm.loadRulesetLabel, this, so, ['domain', 'classical'], data[0]);
		so.depends('type', 'rule_set');
		so.modalonly = true;

		so = ss.option(form.DummyValue, '_value', _('Value'));
		so.load = function(section_id) {
			var option = uci.get(data[0], section_id, 'type');

			return uci.get(data[0], section_id, option)?.join(',');
		}
		so.modalonly = false;

		so = ss.option(form.MultiValue, 'server', _('DNS server'));
		so.value('default-dns');
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, this, so, data[0]);
		so.validate = L.bind(validateNameserver, this);
		so.rmempty = false;
		so.editable = true;
		/* DNS policy END */

		/* Fallback filter START */
		s.tab('fallback_filter', _('Fallback filter'));

		/* Fallback filter */
		o = s.taboption('fallback_filter', form.SectionValue, '_fallback_filter', form.NamedSection, 'dns', 'fchomo', null);
		o.depends({'fchomo.dns.fallback_server': /.+/});
		ss = o.subsection;

		so = ss.option(form.Flag, 'fallback_filter_geoip', _('Geoip enable'));
		so.default = so.enabled;

		so = ss.option(form.Value, 'fallback_filter_geoip_code', _('Geoip code'),
			_('Match response with geoip.</br>') +
			_('The matching <code>%s</code> will be deemed as not-poisoned.').format(_('IP')));
		so.default = 'cn';
		so.placeholder = 'cn';
		so.rmempty = false;
		so.retain = true;
		so.depends('fallback_filter_geoip', '1');

		so = ss.option(form.DynamicList, 'fallback_filter_geosite', _('Geosite'),
			_('Match geosite.</br>') +
			_('The matching <code>%s</code> will be deemed as poisoned.').format(_('Domain')));

		so = ss.option(form.DynamicList, 'fallback_filter_ipcidr', _('IP CIDR'),
			_('Match response with ipcidr.</br>') +
			_('The matching <code>%s</code> will be deemed as poisoned.').format(_('IP')));
		so.datatype = 'list(cidr)';

		so = ss.option(form.DynamicList, 'fallback_filter_domain', _('Domain'),
			_('Match domain. Support wildcards.</br>') +
			_('The matching <code>%s</code> will be deemed as poisoned.').format(_('Domain')));
		/* Fallback filter END */

		return m.render();
	}
});
