'use strict';
'require form';
'require poll';
'require uci';
'require view';

'require fchomo as hm';
'require tools.widgets as widgets';

function loadDNSServerLabel(section_id) {
	delete this.keylist;
	delete this.vallist;

	this.value('default-dns', _('Default DNS (issued by WAN)'));
	this.value('system-dns', _('System DNS'));
	this.value('block-dns', _('Block DNS queries'));
	uci.sections(this.config, 'dns_server', (res) => {
		if (res.enabled !== '0')
			this.value(res['.name'], res.label);
	});

	return this.super('load', section_id);
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
			}).filter(v => v).join('&')
		);
	}
}

class RulesEntry {
	constructor(entry) {
		this.rawentry = entry || '';
		this.rawparams = this.rawentry.split(',');
		this.type = this.rawparams.shift() || '';
		this.factor = this.rawparams.shift() || '';
		this.detour = this.rawparams.shift() || '';
		this.params = {};
		if (this.rawparams.length > 0) {
			this.rawparams.forEach((k) => {
				this.params[k] = 'true';
			});
		}
		this.rawparams = this.rawparams.join(',');
	}

	setKey(key, value) {
		this[key] = value;

		return this
	}

	getParam(param) {
		return this.params[param] || null;
	}

	setParam(param, value) {
		if (value) {
			this.params[param] = value;
		} else
			this.params[param] = null;

		return this
	}

	delParam(param) {
		if (param) {
			delete this.params[param];
		} else
			throw 'illegal param'

		return this
	}

	toString() {
		return [this.type, this.factor, this.detour].concat(
			['no-resolve', 'src'].filter(k => this.params[k])
		).join(',');
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
		var dashboard_repo = uci.get(data[0], 'api', 'dashboard_repo');

		var m, s, o, ss, so;

		m = new form.Map('fchomo', _('Mihomo client'));

		s = m.section(form.TypedSection);
		s.render = function () {
			poll.add(function () {
				return hm.getServiceStatus('mihomo-c').then((isRunning) => {
					hm.updateStatus(hm, document.getElementById('_client_bar'), isRunning ? { dashboard_repo: dashboard_repo } : false, 'mihomo-c', true);
				});
			});

			return E('div', { class: 'cbi-section' }, [
				E('p', [
					hm.renderStatus(hm, '_client_bar', false, 'mihomo-c', true)
				])
			]);
		}

		s = m.section(form.NamedSection, 'global', 'fchomo');

		/* Proxy Group START */
		s.tab('group', _('Proxy Group'));

		/* Client switch */
		o = s.taboption('group', form.Button, '_reload_client', _('Quick Reload'));
		o.inputtitle = _('Reload');
		o.inputstyle = 'apply';
		o.onclick = L.bind(hm.handleReload, o, 'mihomo-c');

		o = s.taboption('group', form.ListValue, 'default_proxy', _('Default outbound'));
		o.ucisection = 'routing';
		o.load = L.bind(hm.loadProxyGroupLabel, o, hm.preset_outbound.direct);

		/* Proxy Group */
		o = s.taboption('group', form.SectionValue, '_group', form.GridSection, 'proxy_group', null);
		ss = o.subsection;
		var prefmt = { 'prefix': 'group_', 'suffix': '' };
		ss.addremove = true;
		ss.rowcolors = true;
		ss.sortable = true;
		ss.nodescriptions = true;
		ss.modaltitle = L.bind(hm.loadModalTitle, ss, _('Proxy Group'), _('Add a proxy group'));
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, ss);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, ss, prefmt, true);
		ss.handleAdd = L.bind(hm.handleAdd, ss, prefmt);

		ss.tab('field_general', _('General fields'));
		ss.tab('field_override', _('Override fields'));
		ss.tab('field_health', _('Health fields'));

		/* General fields */
		so = ss.taboption('field_general', form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, so);
		so.validate = function(section_id, value) {
			if (value.match(/[,]/))
				return _('Expecting: %s').format(_('not included ","'));

			return hm.validateUniqueValue.call(this, section_id, value);
		}
		so.modalonly = true;

		so = ss.taboption('field_general', form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.taboption('field_general', form.ListValue, 'type', _('Type'));
		so.default = hm.proxy_group_type[0][0];
		hm.proxy_group_type.forEach((res) => {
			so.value.apply(so, res);
		})

		// dev: Features under development
		so = ss.taboption('field_general', form.MultiValue, 'groups', _('Group'));
		hm.preset_outbound.full.forEach((res) => {
			so.value.apply(so, res);
		})
		so.load = L.bind(hm.loadProxyGroupLabel, so, hm.preset_outbound.full);
		so.editable = true;

		so = ss.taboption('field_general', form.MultiValue, 'proxies', _('Node'));
		so.value('', _('-- Please choose --'));
		so.load = L.bind(hm.loadNodeLabel, so);
		so.validate = function(section_id, value) {
			if (this.section.getOption('include_all').formvalue(section_id) === '1' ||
			    this.section.getOption('include_all_proxies').formvalue(section_id) === '1')
				this.getUIElement(section_id, this.option).node.setAttribute('disabled', '');
			else
				this.getUIElement(section_id, this.option).node.removeAttribute('disabled');

			return true;
		}
		so.editable = true;

		so = ss.taboption('field_general', form.MultiValue, 'use', _('Provider'));
		so.value('', _('-- Please choose --'));
		so.load = L.bind(hm.loadProviderLabel, so);
		so.validate = function(section_id, value) {
			if (this.section.getOption('include_all').formvalue(section_id) === '1' ||
			    this.section.getOption('include_all_providers').formvalue(section_id) === '1')
				this.getUIElement(section_id, this.option).node.setAttribute('disabled', '');
			else
				this.getUIElement(section_id, this.option).node.removeAttribute('disabled');

			return true;
		}
		so.editable = true;

		so = ss.taboption('field_general', form.Flag, 'include_all', _('Include all'),
			_('Includes all Proxy Node and Provider.'));
		so.default = so.disabled;
		so.editable = true;

		so = ss.taboption('field_general', form.Flag, 'include_all_proxies', _('Include all node'),
			_('Includes all Proxy Node.'));
		so.default = so.disabled;
		so.editable = true;

		so = ss.taboption('field_general', form.Flag, 'include_all_providers', _('Include all provider'),
			_('Includes all Provider.'));
		so.default = so.disabled;
		so.editable = true;

		/* Override fields */
		so = ss.taboption('field_override', form.Flag, 'disable_udp', _('Disable UDP'));
		so.default = so.disabled;
		so.modalonly = true;

		so = ss.taboption('field_override', widgets.DeviceSelect, 'interface_name', _('Bind interface'),
			_('Bind outbound interface.</br>') +
			_('Priority: Proxy Node > Proxy Group > Global.'));
		so.multiple = false;
		so.noaliases = true;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Value, 'routing_mark', _('Routing mark'),
			_('Priority: Proxy Node > Proxy Group > Global.'));
		so.datatype = 'uinteger';
		so.modalonly = true;

		/* Health fields */
		/* Url-test/Fallback/Load-balance */
		so = ss.taboption('field_health', form.Value, 'url', _('Health check URL'));
		so.default = hm.health_checkurls[0][0];
		hm.health_checkurls.forEach((res) => {
			so.value.apply(so, res);
		})
		so.validate = L.bind(hm.validateUrl, so);
		so.depends({type: 'select', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'interval', _('Health check interval'),
			_('In seconds. <code>600</code> will be used if empty.'));
		so.placeholder = '600';
		so.validate = L.bind(hm.validateTimeDuration, so);
		so.depends({type: 'select', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'timeout', _('Health check timeout'),
			_('In millisecond. <code>5000</code> will be used if empty.'));
		so.datatype = 'uinteger';
		so.placeholder = '5000';
		so.depends({type: 'select', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_health', form.Flag, 'lazy', _('Lazy'),
			_('No testing is performed when this provider node is not in use.'));
		so.default = so.enabled;
		so.depends({type: 'select', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'expected_status', _('Health check expected status'),
			_('Expected HTTP code. <code>204</code> will be used if empty. ') +
			_('For format see <a target="_blank" href="%s" rel="noreferrer noopener">%s</a>.')
				.format('https://wiki.metacubex.one/config/proxy-groups/#expected-status', _('Expected status')));
		so.placeholder = '200/302/400-503';
		so.depends({type: 'select', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'max_failed_times', _('Max count of failures'),
			_('Exceeding this triggers a forced health check. <code>5</code> will be used if empty.'));
		so.datatype = 'uinteger';
		so.placeholder = '5';
		so.depends({type: 'select', '!reverse': true});
		so.modalonly = true;

		/* Url-test fields */
		so = ss.taboption('field_general', form.Value, 'tolerance', _('Node switch tolerance'),
			_('In millisecond. <code>150</code> will be used if empty.'));
		so.datatype = 'uinteger';
		so.placeholder = '150';
		so.depends('type', 'url-test');
		so.modalonly = true;

		/* Load-balance fields */
		so = ss.taboption('field_general', form.ListValue, 'strategy', _('Strategy'));
		so.default = hm.load_balance_strategy[0][0];
		hm.load_balance_strategy.forEach((res) => {
			so.value.apply(so, res);
		})
		so.depends('type', 'load-balance');
		so.modalonly = true;

		/* General fields */
		so = ss.taboption('field_general', form.DynamicList, 'filter', _('Node filter'),
			_('Filter nodes that meet keywords or regexps.'));
		so.placeholder = '(?i)港|hk|hongkong|hong kong';
		so.modalonly = true;

		so = ss.taboption('field_general', form.DynamicList, 'exclude_filter', _('Node exclude filter'),
			_('Exclude nodes that meet keywords or regexps.'));
		so.placeholder = 'xxx';
		so.modalonly = true;

		so = ss.taboption('field_general', form.DynamicList, 'exclude_type', _('Node exclude type'),
			_('Exclude matched node types.'));
		so.placeholder = 'ss|http';
		so.modalonly = true;
		/* Proxy Group END */

		/* Routing rules START */
		s.tab('rules', _('Routing rule'));

		/* Routing rules */
		o = s.taboption('rules', form.SectionValue, '_rules', form.GridSection, 'rules', null);
		ss = o.subsection;
		var prefmt = { 'prefix': '', 'suffix': '_host' };
		ss.addremove = true;
		ss.rowcolors = true;
		ss.sortable = true;
		ss.nodescriptions = true;
		ss.modaltitle = L.bind(hm.loadModalTitle, ss, _('Routing rule'), _('Add a routing rule'));
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, ss);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, ss, prefmt, false);
		ss.handleAdd = L.bind(hm.handleAdd, ss, prefmt);

		so = ss.option(form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, so);
		so.validate = L.bind(hm.validateUniqueValue, so);
		so.modalonly = true;

		so = ss.option(form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.option(form.DummyValue, 'entry', _('Entry'));
		so.load = function(section_id) {
			return form.DummyValue.prototype.load.call(this, section_id) || '%s,%s,%s'.format(hm.rules_type[0][0], '', hm.preset_outbound.full[0][0]);
		}
		so.write = L.bind(form.AbstractValue.prototype.write, so);
		so.remove = L.bind(form.AbstractValue.prototype.remove, so);
		so.editable = true;

		so = ss.option(form.ListValue, 'type', _('Type'));
		so.default = hm.rules_type[0][0];
		hm.rules_type.forEach((res) => {
			so.value.apply(so, res);
		})
		so.load = function(section_id) {
			return new RulesEntry(uci.get(data[0], section_id, 'entry')).type;
		}
		so.validate = function(section_id, value) {
			// params only available for types other than
			// https://github.com/muink/mihomo/blob/43f21c0b412b7a8701fe7a2ea6510c5b985a53d6/config/config.go#L1050
			if (['NOT', 'OR', 'AND', 'SUB-RULE'].includes(value) || value.match(/\bREGEX\b/)) {
				var UIEl = this.section.getUIElement(section_id, 'entry');

				var newvalue = new RulesEntry(UIEl.getValue()).setParam('no-resolve').setParam('src').toString();

				UIEl.node.previousSibling.innerText = newvalue;
				UIEl.setValue(newvalue);

				['no-resolve', 'src'].forEach((opt) => {
					let UIEl = this.section.getUIElement(section_id, opt);
					UIEl.setValue('');
					UIEl.node.querySelector('input').disabled = 'true';
				});
			} else {
				this.section.getUIElement(section_id, 'no-resolve').node.querySelector('input').disabled = null;
				this.section.getUIElement(section_id, 'src').node.querySelector('input').disabled = null;
			}

			return true;
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'entry');

			var newvalue = ('N' + UIEl.getValue()).replace(/^[^,]+/, value);

			UIEl.node.previousSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.rmempty = false;
		so.modalonly = true;

		// common factor
		var initFactor = function(uciconfig) {
			this.load = function(section_id) {
				return new RulesEntry(uci.get(uciconfig, section_id, 'entry')).factor;
			}
			this.onchange = function(ev, section_id, value) {
				var UIEl = this.section.getUIElement(section_id, 'entry');

				var newvalue = new RulesEntry(UIEl.getValue()).setKey('factor', value).toString();

				UIEl.node.previousSibling.innerText = newvalue;
				return UIEl.setValue(newvalue);
			}
			this.write = function() {};
			this.rmempty = false;
			this.modalonly = true;
		}

		so = ss.option(form.Value, 'general', _('Factor'));
		so.depends({type: /\bDOMAIN\b/});
		so.depends({type: /\bGEO(SITE|IP)\b/});
		so.depends({type: /\bPROCESS\b/});
		initFactor.call(so, data[0]);

		so = ss.option(form.Value, 'ip', _('Factor'));
		so.datatype = 'cidr';
		so.depends({type: /\bIP\b/});
		initFactor.call(so, data[0]);

		so = ss.option(form.Value, 'port', _('Factor'));
		so.datatype = 'or(port, portrange)';
		so.depends({type: /\bPORT\b/});
		initFactor.call(so, data[0]);

		so = ss.option(form.ListValue, 'l4', _('Factor'));
		so.value('udp', _('UDP'));
		so.value('tcp', _('TCP'));
		so.depends('type', 'NETWORK');
		initFactor.call(so, data[0]);

		so = ss.option(form.ListValue, 'rule_set', _('Factor'));
		so.value('', _('-- Please choose --'));
		so.depends('type', 'RULE-SET');
		initFactor.call(so, data[0]);
		so.load = function(section_id) {
			hm.loadRulesetLabel.call(this, null, section_id);

			return new RulesEntry(uci.get(data[0], section_id, 'entry')).factor;
		}

		// dev: Features under development
		// AND/OR/NOT/SUB-RULE

		so = ss.option(form.ListValue, 'detour', _('Proxy group'));
		so.load = function(section_id) {
			hm.loadProxyGroupLabel.call(this, hm.preset_outbound.full, section_id);

			return new RulesEntry(uci.get(data[0], section_id, 'entry')).detour;
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'entry');

			var newvalue = new RulesEntry(UIEl.getValue()).setKey('detour', value).toString();

			UIEl.node.previousSibling.innerText = newvalue;
			return UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.editable = true;

		so = ss.option(form.Flag, 'no-resolve', _('no-resolve'));
		so.default = so.disabled;
		so.load = function(section_id) {
			return strToFlag(new RulesEntry(uci.get(data[0], section_id, 'entry')).getParam('no-resolve'));
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'entry');

			var newvalue = new RulesEntry(UIEl.getValue()).setParam('no-resolve', flagToStr(value)).toString();

			UIEl.node.previousSibling.innerText = newvalue;
			UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.modalonly = true;

		so = ss.option(form.Flag, 'src', _('src'));
		so.default = so.disabled;
		so.load = function(section_id) {
			return strToFlag(new RulesEntry(uci.get(data[0], section_id, 'entry')).getParam('src'));
		}
		so.onchange = function(ev, section_id, value) {
			var UIEl = this.section.getUIElement(section_id, 'entry');

			var newvalue = new RulesEntry(UIEl.getValue()).setParam('src', flagToStr(value)).toString();

			UIEl.node.previousSibling.innerText = newvalue;
			UIEl.setValue(newvalue);
		}
		so.write = function() {};
		so.modalonly = true;
		/* Routing rules END */

		/* DNS settings START */
		s.tab('dns', _('DNS settings'));

		/* DNS settings */
		o = s.taboption('dns', form.SectionValue, '_dns', form.NamedSection, 'dns', 'fchomo', null);
		ss = o.subsection;

		so = ss.option(form.Value, 'port', _('Listen port'));
		so.datatype = 'port'
		so.placeholder = '7853';
		so.rmempty = false;

		so = ss.option(form.Flag, 'ipv6', _('IPv6 support'));
		so.default = so.enabled;

		so = ss.option(form.MultiValue, 'boot_server', _('Boot DNS server'),
			_('Used to resolve the domain of the DNS server. Must be IP.'));
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, so);
		so.validate = L.bind(validateNameserver, so);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'bootnode_server', _('Boot DNS server (Node)'),
			_('Used to resolve the domain of the Proxy node.'));
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, so);
		so.validate = L.bind(validateNameserver, so);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'default_server', _('Default DNS server'));
		so.description = uci.get(data[0], so.section.section, 'fallback_server') ? _('Final DNS server (Used to Domestic-IP response)') : _('Final DNS server');
		so.default = 'default-dns';
		so.load = L.bind(loadDNSServerLabel, so);
		so.validate = L.bind(validateNameserver, so);
		so.rmempty = false;

		so = ss.option(form.MultiValue, 'fallback_server', _('Fallback DNS server'));
		so.description = uci.get(data[0], so.section.section, 'fallback_server') ? _('Final DNS server (Used to Overseas-IP response)') : _('Fallback DNS server');
		so.load = L.bind(loadDNSServerLabel, so);
		so.validate = L.bind(validateNameserver, so);
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
		ss.modaltitle = L.bind(hm.loadModalTitle, ss, _('DNS server'), _('Add a DNS server'));
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, ss);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, ss, prefmt, true);
		ss.handleAdd = L.bind(hm.handleAdd, ss, prefmt);

		so = ss.option(form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, so);
		so.validate = L.bind(hm.validateUniqueValue, so);
		so.modalonly = true;

		so = ss.option(form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.option(form.DummyValue, 'address', _('Address'));
		so.write = L.bind(form.AbstractValue.prototype.write, so);
		so.remove = L.bind(form.AbstractValue.prototype.remove, so);
		so.editable = true;

		so = ss.option(form.Value, 'addr', _('Address'));
		so.load = function(section_id) {
			return new DNSAddress(uci.get(data[0], section_id, 'address')).addr;
		}
		so.validate = function(section_id, value) {
			if (value.match('#'))
				return _('Expecting: %s').format(_('No add\'l params'));

			// params only available on DoH
			// https://github.com/muink/mihomo/blob/43f21c0b412b7a8701fe7a2ea6510c5b985a53d6/config/config.go#L1211C8-L1211C14
			if (value.match(/^https?:\/\//)){
				this.section.getUIElement(section_id, 'h3').node.querySelector('input').disabled = null;
				this.section.getUIElement(section_id, 'ecs').node.querySelector('input').disabled = null;
				this.section.getUIElement(section_id, 'ecs-override').node.querySelector('input').disabled = null;
			} else {
				var UIEl = this.section.getUIElement(section_id, 'address');

				var newvalue = new DNSAddress(UIEl.getValue()).setParam('h3').setParam('ecs').setParam('ecs-override').toString();

				UIEl.node.previousSibling.innerText = newvalue;
				UIEl.setValue(newvalue);

				['h3', 'ecs', 'ecs-override'].forEach((opt) => {
					let UIEl = this.section.getUIElement(section_id, opt);
					UIEl.setValue('');
					UIEl.node.querySelector('input').disabled = 'true';
				});
			}

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
			hm.loadProxyGroupLabel.call(this, hm.preset_outbound.dns, section_id);

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
			UIEl.setValue(newvalue);
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
			UIEl.setValue(newvalue);
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
		ss.modaltitle = L.bind(hm.loadModalTitle, ss, _('DNS policy'), _('Add a DNS policy'));
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, ss);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, ss, prefmt, false);
		ss.handleAdd = L.bind(hm.handleAdd, ss, prefmt);

		so = ss.option(form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, so);
		so.validate = L.bind(hm.validateUniqueValue, so);
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
		so.value('', _('-- Please choose --'));
		so.load = L.bind(hm.loadRulesetLabel, so, ['domain', 'classical']);
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
		so.load = L.bind(loadDNSServerLabel, so);
		so.validate = L.bind(validateNameserver, so);
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
