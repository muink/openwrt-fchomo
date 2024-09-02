'use strict';
'require form';
'require uci';
'require view';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo')
		]);
	},

	render: function(data) {
		var m, s, o;

		m = new form.Map('fchomo');

		s = m.section(form.NamedSection, 'global', 'fchomo', _('Global settings'));
		s.anonymous = true;

		s = m.section(form.NamedSection, 'experimental', 'fchomo', _('Experimental settings'));
		s.anonymous = true;

		o = s.option(form.Flag, 'quic_go_disable_gso', _('quic-go-disable-gso'));
		o.default = o.disabled;

		o = s.option(form.Flag, 'quic_go_disable_ecn', _('quic-go-disable-ecn'));
		o.default = o.disabled;

		o = s.option(form.Flag, 'dialer_ip4p_convert', _('dialer-ip4p-convert'));
		o.default = o.disabled;

		s = m.section(form.NamedSection, 'config', 'fchomo', _('Resources management'));
		s.anonymous = true;

		return m.render();
	}
});
