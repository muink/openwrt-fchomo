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

		so = ss.option(form.ListValue, 'type', _('Type'));
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

		so = ss.option(form.TextValue, '_editer', _('Editer'),
			_('Please type <a target="_blank" href="https://wiki.metacubex.one/config/proxy-providers/content/">Contents</a>.'));
		so.renderWidget = function(/* ... */) {
			var frameEl = form.TextValue.prototype.renderWidget.apply(this, arguments);

			frameEl.firstChild.style.fontFamily = hm.monospacefonts.join(',');

			return frameEl;
		}
		so.placeholder = _('Content will not be verified, Please make sure you enter it correctly.');
		so.load = function(section_id) {
			return L.resolveDefault(hm.readFile('provider', section_id), '');
		}
		so.write = function(section_id, formvalue) {
			return hm.writeFile('provider', section_id, formvalue);
		}
		so.remove = function(section_id, formvalue) {
			return hm.writeFile('provider', section_id, '');
		}
		so.rmempty = false;
		so.retain = true;
		so.depends('type', 'file');
		so.modalonly = true;

		so = ss.option(form.Value, 'url', _('Provider URL'));
		so.validate = L.bind(hm.validateUrl, this);
		so.rmempty = false;
		so.depends('type', 'http');
		so.modalonly = true;

		so = ss.option(form.Value, 'interval', _('Update interval'),
			_('In seconds. <code>86400</code> will be used if empty.'));
		so.placeholder = '86400';
		so.validate = L.bind(hm.validateTimeDuration, this, data[0], this.section, this.option);
		so.depends('type', 'http');

		so = ss.option(form.ListValue, 'proxy', _('Proxy group'),
			_('Name of the Proxy group to download provider.'));
		so.load = function(section_id) {
			var preadds = [
				['', _('null')],
				['DIRECT', _('DIRECT')]
			];

			return hm.loadProxyGroupLabel.call(this, preadds, data[0], section_id);
		}
		//o.editable = true;
		so.depends('type', 'http');

		so = ss.option(form.TextValue, 'header', _('HTTP header'),
			_('Custom HTTP header.'));
		so.renderWidget = function(/* ... */) {
			var frameEl = form.TextValue.prototype.renderWidget.apply(this, arguments);

			frameEl.firstChild.style.fontFamily = hm.monospacefonts.join(',');

			return frameEl;
		}
		so.placeholder = 'User-Agent:\n- "Clash/v1.18.0"\n- "mihomo/1.18.3"\n# Accept:\n# - ' + "'" + 'application/vnd.github.v3.raw' + "'" + '\n# Authorization:\n# - ' + "'" + 'token 1231231' + "'";
		so.depends('type', 'http');
		so.modalonly = true;
		/* Provider END */

		return m.render();
	}
});
