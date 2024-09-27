'use strict';
'require form';
'require uci';
'require ui';
'require view';

'require fchomo as hm';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo')
		]);
	},

	render: function(data) {
		var m, s, o, ss, so;

		m = new form.Map('fchomo', _('Edit node'));

		s = m.section(form.NamedSection, 'client', 'fchomo');

		/* Proxies START */
		s.tab('proxies', _('Proxies'));

		/* Proxies */
		o = s.taboption('proxies', form.SectionValue, '_proxies', form.GridSection, 'proxies', null);
		ss = o.subsection;
		/* Proxies END */

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
		ss.modaltitle = L.bind(hm.loadModalTitle, this, _('Provider'), _('Add a provider'), data[0]);
		ss.sectiontitle = L.bind(hm.loadDefaultLabel, this, data[0]);
		/* Remove idle files start */
		ss.renderSectionAdd = function(/* ... */) {
			var el = hm.renderSectionAdd.apply(this, [ss, prefmt, false].concat(Array.prototype.slice.call(arguments)));

			el.appendChild(E('button', {
				'class': 'cbi-button cbi-button-add',
				'title': _('Remove idles'),
				'click': ui.createHandlerFn(this, hm.handleRemoveIdles, hm, data[0], 'provider')
			}, [ _('Remove idles') ]));

			return el;
		}
		ss.handleAdd = L.bind(hm.handleAdd, this, ss, prefmt);
		/* Remove idle files end */

		so = ss.option(form.Value, 'label', _('Label'));
		so.load = L.bind(hm.loadDefaultLabel, this, data[0]);
		so.validate = L.bind(hm.validateUniqueValue, this, data[0], 'provider', 'label');
		so.modalonly = true;

		so = ss.option(form.Flag, 'enabled', _('Enable'));
		so.default = so.enabled;
		so.editable = true;
		/* Provider END */

		return m.render();
	}
});
