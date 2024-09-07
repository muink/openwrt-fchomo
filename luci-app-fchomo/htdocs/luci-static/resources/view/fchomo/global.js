'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

'require fchomo as hm';

var callResVersion = rpc.declare({
	object: 'luci.fchomo',
	method: 'resources_get_version',
	params: ['type', 'repo'],
	expect: { '': {} }
});

var callCrondSet = rpc.declare({
	object: 'luci.fchomo',
	method: 'crond_set',
	params: ['type', 'expr'],
	expect: { '': {} }
});

function handleResUpdate(type, repo) {
	var callResUpdate = rpc.declare({
		object: 'luci.fchomo',
		method: 'resources_update',
		params: ['type', 'repo'],
		expect: { '': {} }
	});

	// Dynamic repo
	var label
	if (repo) {
		var section_id = this.section.section;
		var weight = document.getElementById(this.cbid(section_id));
		if (weight)
			repo = weight.firstChild.value,
			label = weight.firstChild.selectedOptions[0].label;
	}

	return L.resolveDefault(callResUpdate(type, repo), {}).then((res) => {
		switch (res.status) {
		case 0:
			this.description = (repo ? label + ' ' : '') + _('Successfully updated.');
			break;
		case 1:
			this.description = (repo ? label + ' ' : '') + _('Update failed.');
			break;
		case 2:
			this.description = (repo ? label + ' ' : '') + _('Already in updating.');
			break;
		case 3:
			this.description = (repo ? label + ' ' : '') + _('Already at the latest version.');
			break;
		default:
			this.description = (repo ? label + ' ' : '') + _('Unknown error.');
			break;
		}

		return this.map.reset();
	});
}

function renderStatus(ElId, isRunning, instance) {
	return E([
		E('button', {
			'class': 'cbi-button cbi-button-apply',
			'click': ui.createHandlerFn(this, hm.handleReload, null, null, instance)
		}, [ _('Reload') ]),
		updateStatus(E('span', { id: ElId, style: 'border: unset; font-style: italic; font-weight: bold' }), isRunning),
		E('a', {
			'class': 'cbi-button cbi-button-apply hidden',
			'href': '',
			'target': '_blank',
			'rel': 'noreferrer noopener'
		}, [ _('Open Dashboard') ])
	]);
}

function updateStatus(El, isRunning, instance) {
	if (El) {
		El.style.color = isRunning ? 'green' : 'red';
		El.innerHTML = '&ensp;%s&ensp;'.format(isRunning ? _('Running') : _('Not Running'));
		/* Dashboard button */
		if (El.nextSibling?.localName === 'a')
			hm.getClashAPI(instance).then((res) => {
				let visible = isRunning && (res.http || res.https)
				El.nextSibling.className = 'cbi-button cbi-button-apply' + (visible ? '' : ' hidden');
				if (visible)
					El.nextSibling.href = 'http%s://%s:%s/'.format(res.https ? 's' : '',
						window.location.hostname,
						res.https ? res.https.split(':').pop() : res.http.split(':').pop());
			});
	}

	return El;
}

function renderResVersion(self, El, type, repo) {
	return L.resolveDefault(callResVersion(type, repo), {}).then((res) => {
		var resEl = E([
			E('button', {
				'class': 'cbi-button cbi-button-apply',
				'click': ui.createHandlerFn(self, handleResUpdate, type, repo)
			}, [ _('Check update') ]),
			updateResVersion(E('span', { style: 'border: unset; font-weight: bold; align-items: center' }), res.version)
		]);

		if (El) {
			El.appendChild(resEl);
			El.lastChild.style.display = 'flex';
		} else
			El = resEl;

		return El;
	});
}

function updateResVersion(El, version) {
	if (El) {
		El.style.color = version ? 'green' : 'red';
		El.innerHTML = '&ensp;%s'.format(version || _('not found'));
	}

	return El;
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo'),
			hm.getFeatures()
		]);
	},

	render: function(data) {
		var features = data[1];

		var m, s, o, ss, so;

		m = new form.Map('fchomo', _('FullCombo Mihomo'),
			'<img src="' + hm.sharktaikogif + '" title="Ciallo～(∠・ω< )⌒☆" height="52"></img>');

		s = m.section(form.NamedSection, 'config', 'fchomo');

		/* Overview START */
		s.tab('status', _('Overview'));

		/* Service status */
		o = s.taboption('status', form.SectionValue, '_status', form.NamedSection, 'config', 'fchomo', _('Service status'));
		ss = o.subsection;

		so = ss.option(form.DummyValue, '_core_version', _('Core version'));
		so.cfgvalue = function() {
			return E('strong', [features.core_version || _('Unknown')]);
		}

		so = ss.option(form.DummyValue, '_client_status', _('Client status'));
		so.cfgvalue = function() { return renderStatus('_client_bar', false, 'mihomo-c') }
		poll.add(function() {
			return hm.getServiceStatus('mihomo-c').then((isRunning) => {
				updateStatus(document.getElementById('_client_bar'), isRunning, 'mihomo-c');
			});
		})

		so = ss.option(form.DummyValue, '_server_status', _('Server status'));
		so.cfgvalue = function() { return renderStatus('_server_bar', false, 'mihomo-s') }
		poll.add(function() {
			return hm.getServiceStatus('mihomo-s').then((isRunning) => {
				updateStatus(document.getElementById('_server_bar'), isRunning, 'mihomo-s');
			});
		})

		so = ss.option(form.Button, '_reload', _('Reload All'));
		so.inputtitle = _('Reload');
		so.inputstyle = 'apply';
		so.onclick = L.bind(hm.handleReload, this);

		so = ss.option(form.DummyValue, '_conn_check', _('Connection check'));
		so.cfgvalue = function() {
			var callConnStat = rpc.declare({
				object: 'luci.fchomo',
				method: 'connection_check',
				params: ['url'],
				expect: { '': {} }
			});

			var ElId = '_connection_check_results';

			return E([
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': ui.createHandlerFn(self, function() {
						var weight = document.getElementById(ElId);

						weight.innerHTML = '';
						return hm.checkurls.forEach((site) => {
							L.resolveDefault(callConnStat(site[0]), {}).then((res) => {
								weight.innerHTML += '<span style="color:%s">&ensp;%s</span>'.format((res.httpcode && res.httpcode.match(/^20\d$/)) ? 'green' : 'red', site[1]);
							});
						});
					})
				}, [ _('Check') ]),
				E('strong', { id: ElId}, [
					E('span', { style: 'color:gray' }, ' ' + _('unchecked'))
				])
			]);
		}

		/* Resources management */
		o = s.taboption('status', form.SectionValue, '_config', form.NamedSection, 'resources', 'fchomo', _('Resources management'));
		ss = o.subsection;

		so = ss.option(form.Flag, 'auto_update', _('Auto update'),
			_('Auto update resources.'));
		so.default = so.disabled;
		so.rmempty = false;
		so.write = function(section_id, formvalue) {
			if (formvalue == 1) {
				callCrondSet('resources', uci.get(data[0], section_id, 'auto_update_expr'));
			} else
				callCrondSet('resources');

			return this.super('write', section_id, formvalue);
		}

		so = ss.option(form.Value, 'auto_update_expr', _('Cron expression'),
			_('The default value is 2:00 every day.'));
		so.default = '0 2 * * *';
		so.placeholder = '0 2 * * *';
		so.rmempty = false;
		so.retain = true;
		so.depends('auto_update', '1');
		so.write = function(section_id, formvalue) {
			callCrondSet('resources', formvalue);

			return this.super('write', section_id, formvalue);
		};
		so.remove = function(section_id) {
			callCrondSet('resources');

			return this.super('remove', section_id);
		};

		so = ss.option(form.ListValue, '_dashboard_version', _('Dashboard version'));
		so.default = hm.dashrepos[0][0];
		hm.dashrepos.forEach((repo) => {
			so.value(repo[0], repo[1]);
		});
		so.write = function() {};
		so.renderWidget = function(/* ... */) {
			var El = form.ListValue.prototype.renderWidget.apply(this, arguments);

			El.className = 'control-group';
			El.firstChild.style.width = '10em';

			return renderResVersion(this, El, 'dashboard', this.default);
		}
		so.validate = function(section_id, value) {
			this.default = value;

			var weight = document.getElementById(this.cbid(section_id));
			if (weight)
				L.resolveDefault(callResVersion('dashboard', value), {}).then((res) => {
					updateResVersion(weight.lastChild, res.version);
				});

			return true;
		}

		so = ss.option(form.DummyValue, '_geoip_version', _('GeoIP version'));
		so.cfgvalue = function() { return renderResVersion(this, null, 'geoip') };

		so = ss.option(form.DummyValue, '_geosite_version', _('GeoSite version'));
		so.cfgvalue = function() { return renderResVersion(this, null, 'geosite') };

		so = ss.option(form.DummyValue, '_china_ip4_version', _('China IPv4 list version'));
		so.cfgvalue = function() { return renderResVersion(this, null, 'china_ip4') };

		so = ss.option(form.DummyValue, '_china_ip6_version', _('China IPv6 list version'));
		so.cfgvalue = function() { return renderResVersion(this, null, 'china_ip6') };

		so = ss.option(form.DummyValue, '_gfw_list_version', _('GFW list version'));
		so.cfgvalue = function() { return renderResVersion(this, null, 'gfw_list') };

		so = ss.option(form.DummyValue, '_china_list_version', _('China list version'));
		so.cfgvalue = function() { return renderResVersion(this, null, 'china_list') };
		/* Overview END */

		/* Global settings START */
		s.tab('global', _('Global settings'));

		/* Global settings*/
		o = s.taboption('global', form.SectionValue, '_global', form.NamedSection, 'global', 'fchomo', _('Global settings'));
		ss = o.subsection;

		/* Experimental settings */
		o = s.taboption('global', form.SectionValue, '_experimental', form.NamedSection, 'experimental', 'fchomo', _('Experimental settings'));
		ss = o.subsection;

		so = ss.option(form.Flag, 'quic_go_disable_gso', _('quic-go-disable-gso'));
		so.default = so.disabled;

		so = ss.option(form.Flag, 'quic_go_disable_ecn', _('quic-go-disable-ecn'));
		so.default = so.disabled;

		so = ss.option(form.Flag, 'dialer_ip4p_convert', _('dialer-ip4p-convert'));
		so.default = so.disabled;
		/* Global settings END */

		return m.render();
	}
});
