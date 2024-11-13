'use strict';
'require form';
'require uci';
'require ui';
'require view';

'require fchomo as hm';
'require tools.widgets as widgets';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo')
		]);
	},

	render: function(data) {
		var m, s, o, ss, so;

		m = new form.Map('fchomo', _('Edit node'));

		s = m.section(form.NamedSection, 'global', 'fchomo');

		/* Proxy Node START */
		s.tab('node', _('Proxy Node'));

		/* Proxy Node */
		o = s.taboption('node', form.SectionValue, '_node', form.GridSection, 'node', null);
		ss = o.subsection;
		var prefmt = { 'prefix': 'node_', 'suffix': '' };
		ss.addremove = true;
		ss.rowcolors = true;
		ss.sortable = true;
		ss.nodescriptions = true;
		ss.modaltitle = L.bind(hm.loadModalTitle, ss, _('Node'), _('Add a Node'));
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, ss);
		ss.renderSectionAdd = L.bind(hm.renderSectionAdd, ss, prefmt, true);
		ss.handleAdd = L.bind(hm.handleAdd, ss, prefmt);

		ss.tab('field_general', _('General fields'));
		ss.tab('field_dial', _('Dial fields'));
		ss.tab('field_multiplex', _('Multiplex fields'));

		so = ss.taboption('field_general', form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, so);
		so.validate = L.bind(hm.validateUniqueValue, so);
		so.modalonly = true;

		so = ss.taboption('field_general', form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.taboption('field_general', form.ListValue, 'type', _('Type'));
		so.default = hm.outbound_type[0][0];
		hm.outbound_type.forEach((res) => {
			so.value.apply(so, res);
		})

		so = ss.taboption('field_general', form.Value, 'server', _('Address'));
		so.datatype = 'host';
		so.rmempty = false;
		so.depends({type: 'direct', '!reverse': true});

		so = ss.taboption('field_general', form.Value, 'port', _('Port'));
		so.datatype = 'port';
		so.rmempty = false;
		so.depends({type: 'direct', '!reverse': true});

		/* HTTP / SOCKS fields */
		/* hm.validateAuth */
		so = ss.taboption('field_general', form.Value, 'username', _('Username'));
		so.validate = L.bind(hm.validateAuthUsername, so);
		so.depends({type: /^(http|socks5|ssh)$/});
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'password', _('Password'));
		so.password = true;
		so.validate = L.bind(hm.validateAuthPassword, so);
		so.depends({type: /^(http|socks5|trojan|hysteria2|tuic|ssh)$/});
		so.modalonly = true;

		/* Shadowsocks fields */
		so = ss.taboption('field_general', form.ListValue, 'shadowsocks_chipher', _('Chipher'));
		so.default = hm.shadowsocks_cipher_methods[1][0];
		hm.shadowsocks_cipher_methods.forEach((res) => {
			so.value.apply(so, res);
		})
		so.depends('type', 'ss');
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'shadowsocks_password', _('Password'));
		so.password = true;
		so.validate = function(section_id, value) {
			var encmode = this.section.getOption('shadowsocks_chipher').formvalue(section_id);
			return hm.validateShadowsocksPassword.call(this, hm, encmode, section_id, value);
		}
		so.depends({type: 'ss', shadowsocks_chipher: /.+/});
		so.modalonly = true;

		so = ss.taboption('field_general', form.ListValue, 'shadowsocks_plugin', _('Plugin'));
		so.value('', _('none'));
		so.value('obfs', _('obfs-simple'));
		//so.value('v2ray-plugin', _('v2ray-plugin'));
		so.value('shadow-tls', _('shadow-tls'));
		so.value('restls', _('restls'));
		so.depends('type', 'ss');
		so.modalonly = true;

		/* Shadowsocks Plugin fields */
		so = ss.taboption('field_general', form.ListValue, 'shadowsocks_plugin_opts_obfsmode', _('Mode'));
		so.value('http', _('HTTP'));
		so.value('tls', _('TLS'));
		so.depends('shadowsocks_plugin', 'obfs');
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'shadowsocks_plugin_opts_host', _('Host that supports TLS 1.3'));
		so.placeholder = 'cloud.tencent.com';
		so.depends({shadowsocks_plugin: /^(obfs|v2ray-plugin|shadow-tls|restls)$/});
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'shadowsocks_plugin_opts_thetlspassword', _('Password'));
		so.password = true;
		so.depends({shadowsocks_plugin: /^(shadow-tls|restls)$/});
		so.modalonly = true;

		so = ss.taboption('field_general', form.ListValue, 'shadowsocks_plugin_opts_shadowtls_version', _('Version'));
		so.value('1', _('v1'));
		so.value('2', _('v2'));
		so.value('3', _('v3'));
		so.default = '2';
		so.depends({shadowsocks_plugin: 'shadow-tls'});
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'shadowsocks_plugin_opts_restls_versionhint', _('version-hint'));
		so.default = 'tls13';
		so.depends({shadowsocks_plugin: 'restls'});
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'shadowsocks_plugin_opts_restls_script', _('restls-script'));
		so.default = '300?100<1,400~100,350~100,600~100,300~200,300~100';
		so.depends({shadowsocks_plugin: 'restls'});
		so.modalonly = true;

		/* Extra fields */
		so = ss.taboption('field_general', form.ListValue, 'client_fingerprint', _('Client fingerprint'));
		so.default = hm.tls_client_fingerprints[0][0];
		hm.tls_client_fingerprints.forEach((res) => {
			so.value.apply(so, res);
		})
		so.depends({type: /^(vmess|vless|trojan)$/});
		so.depends({type: 'ss', shadowsocks_plugin: /^(shadow-tls|restls)$/});
		so.modalonly = true;

		// dev: Features under development
		so = ss.taboption('field_general', form.Flag, 'udp', _('UDP'));
		so.default = so.disabled;
		so.depends({type: /^(direct|socks5|ss|vmess|vless|trojan|wireguard)$/});
		so.modalonly = true;

		so = ss.taboption('field_general', form.Flag, 'uot', _('UoT'),
			_('Enable the SUoT protocol, requires server support. Conflict with Multiplex.'));
		so.default = so.disabled;
		so.depends('type', 'ss');
		so.modalonly = true;

		so = ss.taboption('field_general', form.ListValue, 'uot_version', _('SUoT version'));
		so.value('1', _('v1'));
		so.value('2', _('v2'));
		so.default = '2';
		so.depends('uot', '1');
		so.modalonly = true;

		so = ss.taboption('field_general', form.Flag, 'smux_enabled', _('Multiplex'));
		so.default = so.disabled;
		so.depends({type: /^(ss|vmess|vless|trojan|)$/, uot: '0'});
		so.modalonly = true;

		/* Dial fields */
		so = ss.taboption('field_dial', form.Flag, 'tfo', _('TFO'));
		so.default = so.disabled;
		so.depends({type: 'direct', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_dial', form.Flag, 'mptcp', _('mpTCP'));
		so.default = so.disabled;
		so.depends({type: 'direct', '!reverse': true});
		so.modalonly = true;

		// dev: Features under development
		so = ss.taboption('field_dial', form.Value, 'dialer_proxy', _('dialer-proxy'));
		so.readonly = true;
		so.depends({type: 'direct', '!reverse': true});
		so.modalonly = true;

		so = ss.taboption('field_dial', widgets.DeviceSelect, 'interface_name', _('Bind interface'),
			_('Bind outbound interface.</br>') +
			_('Priority: Proxy Node > Proxy Group > Global.'));
		so.multiple = false;
		so.noaliases = true;
		so.modalonly = true;

		so = ss.taboption('field_dial', form.Value, 'routing_mark', _('Routing mark'),
			_('Priority: Proxy Node > Proxy Group > Global.'));
		so.datatype = 'uinteger';
		so.modalonly = true;

		so = ss.taboption('field_dial', form.ListValue, 'ip_version', _('ip-version'));
		so.default = hm.ip_version[0][0];
		hm.ip_version.forEach((res) => {
			so.value.apply(so, res);
		})
		so.modalonly = true;

		/* Multiplex fields */ // TCP protocol only
		so = ss.taboption('field_multiplex', form.ListValue, 'smux_protocol', _('Protocol'));
		so.default = 'h2mux';
		so.value('smux', _('smux'));
		so.value('yamux', _('yamux'));
		so.value('h2mux', _('h2mux'));
		so.depends('smux_enabled', '1');
		so.modalonly = true;
		/* Proxy Node END */

		/* Provider START */
		s.tab('provider', _('Provider'));

		/* Provider */
		o = s.taboption('provider', form.SectionValue, '_provider', form.GridSection, 'provider', null);
		ss = o.subsection;
		var prefmt = { 'prefix': 'sub_', 'suffix': '' };
		ss.addremove = true;
		ss.rowcolors = true;
		ss.sortable = true;
		ss.nodescriptions = true;
		ss.modaltitle = L.bind(hm.loadModalTitle, ss, _('Provider'), _('Add a provider'));
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, ss);
		/* Remove idle files start */
		ss.renderSectionAdd = function(/* ... */) {
			var el = hm.renderSectionAdd.apply(this, [prefmt, false].concat(Array.prototype.slice.call(arguments)));

			el.appendChild(E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': _('Remove idles'),
				'click': ui.createHandlerFn(this, hm.handleRemoveIdles, hm)
			}, [ _('Remove idles') ]));

			return el;
		}
		ss.handleAdd = L.bind(hm.handleAdd, ss, prefmt);
		/* Remove idle files end */

		ss.tab('field_general', _('General fields'));
		ss.tab('field_override', _('Override fields'));
		ss.tab('field_health', _('Health fields'));

		/* General fields */
		so = ss.taboption('field_general', form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, so);
		so.validate = L.bind(hm.validateUniqueValue, so);
		so.modalonly = true;

		so = ss.taboption('field_general', form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;

		so = ss.taboption('field_general', form.ListValue, 'type', _('Type'));
		so.value('file', _('Local'));
		so.value('http', _('Remote'));
		so.default = 'http';

		so = ss.option(form.DummyValue, '_value', _('Value'));
		so.load = function(section_id) {
			var option = uci.get(data[0], section_id, 'type');

			switch (option) {
				case 'file':
					return uci.get(data[0], section_id, '.name');
				case 'http':
					return uci.get(data[0], section_id, 'url');
				default:
					return null;
			}
		}
		so.modalonly = false;

		so = ss.taboption('field_general', form.TextValue, '_editer', _('Editer'),
			_('Please type <a target="_blank" href="%s" rel="noreferrer noopener">%s</a>.')
				.format('https://wiki.metacubex.one/config/proxy-providers/content/', _('Contents')));
		so.renderWidget = function(/* ... */) {
			var frameEl = form.TextValue.prototype.renderWidget.apply(this, arguments);

			frameEl.firstChild.style.fontFamily = hm.monospacefonts.join(',');

			return frameEl;
		}
		so.placeholder = _('Content will not be verified, Please make sure you enter it correctly.');
		so.load = function(section_id) {
			return L.resolveDefault(hm.readFile('provider', section_id), '');
		}
		so.write = L.bind(hm.writeFile, so, 'provider');
		so.remove = L.bind(hm.writeFile, so, 'provider');
		so.rmempty = false;
		so.retain = true;
		so.depends('type', 'file');
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'url', _('Provider URL'));
		so.validate = L.bind(hm.validateUrl, so);
		so.rmempty = false;
		so.depends('type', 'http');
		so.modalonly = true;

		so = ss.taboption('field_general', form.Value, 'interval', _('Update interval'),
			_('In seconds. <code>%s</code> will be used if empty.').format('86400'));
		so.placeholder = '86400';
		so.validate = L.bind(hm.validateTimeDuration, so);
		so.depends('type', 'http');

		so = ss.taboption('field_general', form.ListValue, 'proxy', _('Proxy group'),
			_('Name of the Proxy group to download provider.'));
		so.default = hm.preset_outbound.direct[0][0];
		hm.preset_outbound.direct.forEach((res) => {
			so.value.apply(so, res);
		})
		so.load = L.bind(hm.loadProxyGroupLabel, so, hm.preset_outbound.direct);
		so.textvalue = L.bind(hm.textvalue2Value, so);
		//so.editable = true;
		so.depends('type', 'http');

		so = ss.taboption('field_general', form.TextValue, 'header', _('HTTP header'),
			_('Custom HTTP header.'));
		so.renderWidget = function(/* ... */) {
			var frameEl = form.TextValue.prototype.renderWidget.apply(this, arguments);

			frameEl.firstChild.style.fontFamily = hm.monospacefonts.join(',');

			return frameEl;
		}
		so.placeholder = '{\n  "User-Agent": [\n    "Clash/v1.18.0",\n    "mihomo/1.18.3"\n  ],\n  "Accept": [\n    //"application/vnd.github.v3.raw"\n  ],\n  "Authorization": [\n    //"token 1231231"\n  ]\n}';
		so.validate = L.bind(hm.validateJson, so);
		so.depends('type', 'http');
		so.modalonly = true;

		/* Override fields */
		// https://github.com/muink/mihomo/blob/43f21c0b412b7a8701fe7a2ea6510c5b985a53d6/adapter/provider/parser.go#L30

		so = ss.taboption('field_override', form.Value, 'override_prefix', _('Add prefix'));
		so.modalonly = true;

		so = ss.taboption('field_override', form.Value, 'override_suffix', _('Add suffix'));
		so.modalonly = true;

		so = ss.taboption('field_override', form.DynamicList, 'override_replace', _('Replace name'),
			_('Replace node name. ') +
			_('For format see <a target="_blank" href="%s" rel="noreferrer noopener">%s</a>.')
				.format('https://wiki.metacubex.one/config/proxy-providers/#overrideproxy-name', _('override.proxy-name')));
		so.placeholder = '{"pattern": "IPLC-(.*?)倍", "target": "iplc x $1"}';
		so.validate = L.bind(hm.validateJson, so);
		so.modalonly = true;

		so = ss.taboption('field_override', form.DummyValue, '_config_items', null);
		so.load = function() {
			return '<a target="_blank" href="%s" rel="noreferrer noopener">%s</a>'
				.format('https://wiki.metacubex.one/config/proxy-providers/#_2', _('Configuration Items'));
		}
		so.rawhtml = true;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Flag, 'override_tfo', _('TFO'));
		so.default = so.disabled;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Flag, 'override_mptcp', _('mpTCP'));
		so.default = so.disabled;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Flag, 'override_udp', _('UDP'));
		so.default = so.enabled;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Flag, 'override_uot', _('UoT'),
			_('Enable the SUoT protocol, requires server support. Conflict with Multiplex.'));
		so.default = so.disabled;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Value, 'override_up', _('up'),
			_('In Mbps.'));
		so.datatype = 'uinteger';
		so.modalonly = true;

		so = ss.taboption('field_override', form.Value, 'override_down', _('down'),
			_('In Mbps.'));
		so.datatype = 'uinteger';
		so.modalonly = true;

		so = ss.taboption('field_override', form.Flag, 'override_skip_cert_verify', _('skip-cert-verify'));
		so.default = so.disabled;
		so.modalonly = true;

		// dev: Features under development
		so = ss.taboption('field_override', form.Value, 'override_dialer_proxy', _('dialer-proxy'));
		so.readonly = true;
		so.modalonly = true;

		so = ss.taboption('field_override', widgets.DeviceSelect, 'override_interface_name', _('Bind interface'),
			_('Bind outbound interface.</br>') +
			_('Priority: Proxy Node > Proxy Group > Global.'));
		so.multiple = false;
		so.noaliases = true;
		so.modalonly = true;

		so = ss.taboption('field_override', form.Value, 'override_routing_mark', _('Routing mark'),
			_('Priority: Proxy Node > Proxy Group > Global.'));
		so.datatype = 'uinteger';
		so.modalonly = true;

		so = ss.taboption('field_override', form.ListValue, 'override_ip_version', _('ip-version'));
		so.default = hm.ip_version[0][0];
		hm.ip_version.forEach((res) => {
			so.value.apply(so, res);
		})
		so.modalonly = true;

		/* Health fields */
		so = ss.taboption('field_health', form.Flag, 'health_enable', _('Enable'));
		so.default = so.enabled;
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'health_url', _('Health check URL'));
		so.default = hm.health_checkurls[0][0];
		hm.health_checkurls.forEach((res) => {
			so.value.apply(so, res);
		})
		so.validate = L.bind(hm.validateUrl, so);
		so.retain = true;
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'health_interval', _('Health check interval'),
			_('In seconds. <code>%s</code> will be used if empty.').format('600'));
		so.placeholder = '600';
		so.validate = L.bind(hm.validateTimeDuration, so);
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'health_timeout', _('Health check timeout'),
			_('In millisecond. <code>%s</code> will be used if empty.').format('5000'));
		so.datatype = 'uinteger';
		so.placeholder = '5000';
		so.modalonly = true;

		so = ss.taboption('field_health', form.Flag, 'health_lazy', _('Lazy'),
			_('No testing is performed when this provider node is not in use.'));
		so.default = so.enabled;
		so.modalonly = true;

		so = ss.taboption('field_health', form.Value, 'health_expected_status', _('Health check expected status'),
			_('Expected HTTP code. <code>204</code> will be used if empty. ') +
			_('For format see <a target="_blank" href="%s" rel="noreferrer noopener">%s</a>.')
				.format('https://wiki.metacubex.one/config/proxy-groups/#expected-status', _('Expected status')));
		so.placeholder = '200/302/400-503';
		so.modalonly = true;

		/* General fields */
		so = ss.taboption('field_general', form.DynamicList, 'filter', _('Node filter'),
			_('Filter nodes that meet keywords or regexps.'));
		so.placeholder = '(?i)港|hk|hongkong|hong kong';
		so.modalonly = true;

		so = ss.taboption('field_general', form.DynamicList, 'exclude_filter', _('Node exclude filter'),
			_('Exclude nodes that meet keywords or regexps.'));
		so.default = '重置|到期|过期|剩余|套餐 海外用户|回国'
		so.placeholder = 'xxx';
		so.modalonly = true;

		so = ss.taboption('field_general', form.DynamicList, 'exclude_type', _('Node exclude type'),
			_('Exclude matched node types.'));
		so.placeholder = 'ss|http';
		so.modalonly = true;

		so = ss.option(form.DummyValue, '_update');
		so.cfgvalue = L.bind(hm.renderResDownload, so, hm);
		so.editable = true;
		so.modalonly = false;
		/* Provider END */

		return m.render();
	}
});
