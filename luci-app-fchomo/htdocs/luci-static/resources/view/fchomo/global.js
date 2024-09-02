'use strict';
'require form';
'require poll';
'require uci';
'require ui';
'require view';

'require fchomo as hm';

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

function updateStatus(El, isRunning) {
	if (El) {
		El.style.color = isRunning ? 'green' : 'red';
		El.innerHTML = '&ensp;%s&ensp;'.format(isRunning ? _('Running') : _('Not Running'));
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

		m = new form.Map('fchomo');

		s = m.section(form.NamedSection, 'config', 'fchomo');

		/* Service status START */
		s.tab('status', _('Service status'));
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
				updateStatus(document.getElementById('_client_bar'), isRunning);
			});
		})

		so = ss.option(form.DummyValue, '_server_status', _('Server status'));
		so.cfgvalue = function() { return renderStatus('_server_bar', false, 'mihomo-s') }
		poll.add(function() {
			return hm.getServiceStatus('mihomo-s').then((isRunning) => {
				updateStatus(document.getElementById('_server_bar'), isRunning);
			});
		})

		so = ss.option(form.Button, '_reload', _('Reload All'));
		so.inputtitle = _('Reload');
		so.inputstyle = 'apply';
		so.onclick = L.bind(hm.handleReload, this);

		/* Resources management */
		o = s.taboption('status', form.SectionValue, '_config', form.NamedSection, 'config', 'fchomo', _('Resources management'));
		ss = o.subsection;

		/* Service status END */

		/* Global settings START */
		s.tab('global', _('Global settings'));
		o = s.taboption('global', form.SectionValue, '_global', form.NamedSection, 'global', 'fchomo', _('Global settings'));
		ss = o.subsection;

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
