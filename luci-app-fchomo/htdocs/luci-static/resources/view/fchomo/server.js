'use strict';
'require form';
'require poll';
'require uci';
'require ui';
'require view';

'require fchomo as hm';

function handleGenKey(option) {
	var section_id = this.section.section;
	var type = this.section.getOption('type').formvalue(section_id);
	var widget = this.map.findElement('id', 'widget.cbid.fchomo.%s.%s'.format(section_id, option));
	var password, required_method;

	if (option === 'uuid' || option.match(/_uuid/))
		required_method = 'uuid';
	else if (type === 'shadowsocks')
		required_method = this.section.getOption('shadowsocks_chipher')?.formvalue(section_id);

	switch (required_method) {
		/* NONE */
		case 'none':
			password = '';
			break;
		/* UUID */
		case 'uuid':
			password = hm.generateRand('uuid');
			break;
		/* DEFAULT */
		default:
			password = hm.generateRand('hex', 16);
			break;
	}
	/* AEAD */
	(function(length) {
		if (length && length > 0)
			password = hm.generateRand('base64', length);
	}(hm.shadowsocks_cipher_length[required_method]));

	return widget.value = password;
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo'),
			hm.getFeatures()
		]);
	},

	render: function(data) {
		var dashboard_repo = uci.get(data[0], 'api', 'dashboard_repo'),
		    features = data[1];

		var m, s, o;

		m = new form.Map('fchomo', _('Mihomo server'));

		s = m.section(form.TypedSection);
		s.render = function () {
			poll.add(function () {
				return hm.getServiceStatus('mihomo-s').then((isRunning) => {
					hm.updateStatus(hm, document.getElementById('_server_bar'), isRunning ? { dashboard_repo: dashboard_repo } : false, 'mihomo-s', true);
				});
			});

			return E('div', { class: 'cbi-section' }, [
				E('p', [
					hm.renderStatus(hm, '_server_bar', false, 'mihomo-s', true)
				])
			]);
		}

		s = m.section(form.NamedSection, 'routing', 'fchomo', null);

		/* Server switch */
		o = s.option(form.Button, '_reload_server', _('Quick Reload'));
		o.inputtitle = _('Reload');
		o.inputstyle = 'apply';
		o.onclick = L.bind(hm.handleReload, o, 'mihomo-s');

		o = s.option(form.Flag, 'server_enabled', _('Enable'));
		o.default = o.disabled;

		o = s.option(form.Flag, 'server_auto_firewall', _('Auto configure firewall'));
		o.default = o.disabled;

		/* Server settings START */
		s = m.section(form.GridSection, 'server', null);
		var prefmt = { 'prefix': 'server_', 'suffix': '' };
		s.addremove = true;
		s.rowcolors = true;
		s.sortable = true;
		s.nodescriptions = true;
		s.modaltitle = L.bind(hm.loadModalTitle, s, _('Server'), _('Add a server'));
		s.sectiontitle = L.bind(hm.loadDefaultLabel, s);
		s.renderSectionAdd = L.bind(hm.renderSectionAdd, s, prefmt, false);
		s.handleAdd = L.bind(hm.handleAdd, s, prefmt);

		/* General fields */
		o = s.option(form.Value, 'label', _('Label'));
		o.load = L.bind(hm.loadDefaultLabel, o);
		o.validate = L.bind(hm.validateUniqueValue, o);
		o.modalonly = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = o.enabled;
		o.editable = true;

		o = s.option(form.ListValue, 'type', _('Type'));
		o.default = hm.inbound_type[0][0];
		hm.inbound_type.forEach((res) => {
			o.value.apply(o, res);
		})

		o = s.option(form.Value, 'listen', _('Listen address'));
		o.datatype = 'ipaddr';
		o.placeholder = '::';
		o.modalonly = true;

		o = s.option(form.Value, 'port', _('Listen port'));
		o.datatype = 'port';
		o.rmempty = false;

		// dev: Features under development
		// rule
		// proxy

		/* HTTP / SOCKS fields */
		/* hm.validateAuth */
		o = s.option(form.Value, 'username', _('Username'));
		o.validate = L.bind(hm.validateAuthUsername, o);
		o.depends({type: /^(http|socks|mixed|hysteria2)$/});
		o.modalonly = true;

		o = s.option(form.Value, 'password', _('Password'));
		o.password = true;
		o.renderWidget = function() {
			var node = form.Value.prototype.renderWidget.apply(this, arguments);

			(node.querySelector('.control-group') || node).appendChild(E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': _('Generate'),
				'click': ui.createHandlerFn(this, handleGenKey, this.option)
			}, [ _('Generate') ]));

			return node;
		}
		o.validate = function(section_id, value) {
		}
		o.validate = L.bind(hm.validateAuthPassword, o);
		o.rmempty = false;
		o.depends({type: /^(http|socks|mixed|hysteria2)$/, username: /.+/});
		o.depends({type: /^(tuic)$/, uuid: /.+/});
		o.modalonly = true;

		/* Shadowsocks fields */
		o = s.option(form.ListValue, 'shadowsocks_chipher', _('Chipher'));
		o.default = hm.shadowsocks_cipher_methods[1][0];
		hm.shadowsocks_cipher_methods.forEach((res) => {
			o.value.apply(o, res);
		})
		o.depends('type', 'shadowsocks');
		o.modalonly = true;

		o = s.option(form.Value, 'shadowsocks_password', _('Password'));
		o.password = true;
		o.renderWidget = function() {
			var node = form.Value.prototype.renderWidget.apply(this, arguments);

			(node.querySelector('.control-group') || node).appendChild(E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': _('Generate'),
				'click': ui.createHandlerFn(this, handleGenKey, this.option)
			}, [ _('Generate') ]));

			return node;
		}
		o.validate = function(section_id, value) {
				var encmode = this.section.getOption('shadowsocks_chipher').formvalue(section_id);
				var length = hm.shadowsocks_cipher_length[encmode];
				if (length) {
					length = Math.ceil(length/3)*4;
					if (encmode.match(/^2022-/)) {
						if (value.length !== length || !value.match(/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/) || value[length-1] !== '=')
							return _('Expecting: %s').format(_('valid base64 key with %d characters').format(length));
					} else {
						if (length !== 0 && value.length !== length)
							return _('Expecting: %s').format(_('valid key length with %d characters').format(length));
					}
				} else
					return true;

			return true;
		}
		o.depends({type: 'shadowsocks', shadowsocks_chipher: /.+/});
		o.modalonly = true;

		/* Tuic fields */
		o = s.option(form.Value, 'uuid', _('UUID'));
		o.renderWidget = function() {
			var node = form.Value.prototype.renderWidget.apply(this, arguments);

			(node.querySelector('.control-group') || node).appendChild(E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': _('Generate'),
				'click': ui.createHandlerFn(this, handleGenKey, this.option)
			}, [ _('Generate') ]));

			return node;
		}
		o.rmempty = false;
		o.validate = L.bind(hm.validateUUID, o);
		o.depends('type', 'tuic');
		o.modalonly = true;

		o = s.option(form.ListValue, 'tuic_congestion_controller', _('Congestion controller'),
			_('QUIC congestion controller.'));
		o.default = 'cubic';
		o.value('cubic', _('cubic'));
		o.value('new_reno', _('new_reno'));
		o.value('bbr', _('bbr'));
		o.depends('type', 'tuic');
		o.modalonly = true;

		o = s.option(form.Value, 'tuic_max_idle_time', _('Idle timeout'),
			_('In seconds.'));
		o.default = '15000';
		o.validate = L.bind(hm.validateTimeDuration, o);
		o.depends('type', 'tuic');
		o.modalonly = true;

		o = s.option(form.Value, 'tuic_authentication_timeout', _('Auth timeout'),
			_('In seconds.'));
		o.default = '1000';
		o.validate = L.bind(hm.validateTimeDuration, o);
		o.depends('type', 'tuic');
		o.modalonly = true;

		o = s.option(form.Value, 'tuic_max_udp_relay_packet_size', _('Max UDP relay packet size'));
		o.datatype = 'uinteger';
		o.default = '1500';
		o.depends('type', 'tuic');
		o.modalonly = true;

		/* VMess fields */
		o = s.option(form.Value, 'vmess_uuid', _('UUID'));
		o.renderWidget = function() {
			var node = form.Value.prototype.renderWidget.apply(this, arguments);

			(node.querySelector('.control-group') || node).appendChild(E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': _('Generate'),
				'click': ui.createHandlerFn(this, handleGenKey, this.option)
			}, [ _('Generate') ]));

			return node;
		}
		o.rmempty = false;
		o.validate = L.bind(hm.validateUUID, o);
		o.depends('type', 'vmess');
		o.modalonly = true;

		o = s.option(form.Value, 'vmess_alterid', _('Alter ID'),
			_('Legacy protocol support (VMess MD5 Authentication) is provided for compatibility purposes only, use of alterId > 1 is not recommended.'));
		o.datatype = 'uinteger';
		o.placeholder = '0';
		o.depends('type', 'vmess');
		o.modalonly = true;

		/* Extra fields */
		o = s.option(form.Flag, 'udp', _('UDP'));
		o.default = o.disabled;
		o.depends({type: /^(socks|mixed|shadowsocks)$/});
		o.modalonly = true;
		/* Server settings END */

		return m.render();
	}
});
