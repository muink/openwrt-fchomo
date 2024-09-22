'use strict';
'require form';
'require uci';
'require view';

'require fchomo as hm';

return view.extend({
	load: function() {
		return Promise.all([
			uci.load('fchomo')
		]);
	},

	render: function(data) {
		var m, s, o;

		m = new form.Map('fchomo', _('Edit ruleset'));

		/* Rule set START */
		/* Rule set settings */
		var prefmt = { 'prefix': 'rule_', 'suffix': '' };
		s = m.section(form.GridSection, 'ruleset');
		s.addremove = true;
		s.rowcolors = true;
		s.sortable = true;
		s.nodescriptions = true;
		s.modaltitle = L.bind(hm.loadModalTitle, this, _('Rule set'), _('Add a rule set'), data[0]);
		s.sectiontitle = L.bind(hm.loadDefaultLabel, this, data[0]);
		s.renderSectionAdd = L.bind(hm.renderSectionAdd, this, s, prefmt, false);
		s.handleAdd = L.bind(hm.handleAdd, this, s, prefmt);

		o = s.option(form.Value, 'label', _('Label'));
		o.load = L.bind(hm.loadDefaultLabel, this, data[0]);
		o.validate = L.bind(hm.validateUniqueValue, this, data[0], 'ruleset', 'label');
		o.modalonly = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = o.enabled;
		o.editable = true;

		o = s.option(form.ListValue, 'type', _('Type'));
		o.value('file', _('Local'));
		o.value('http', _('Remote'));
		o.default = 'http';

		o = s.option(form.ListValue, 'format', _('Format'));
		o.value('text', _('Plain text'));
		o.value('yaml', _('Yaml text'));
		o.value('mrs', _('Binary file'));
		o.default = 'mrs';
		o.validate = function(section_id, value) {
			var behavior = this.section.getUIElement(section_id, 'behavior').getValue();

			if (value === 'mrs' && behavior === 'classical')
				return _('Expecting: %s').format(_('Binary format only supports domain / ipcidr'));

			return true;
		}

		o = s.option(form.ListValue, 'behavior', _('Behavior'));
		o.value('classical');
		o.value('domain');
		o.value('ipcidr');
		o.default = 'classical';
		o.validate = function(section_id, value) {
			var format = this.section.getUIElement(section_id, 'format').getValue();

			if (value === 'classical' && format === 'mrs')
				return _('Expecting: %s').format(_('Binary format only supports domain / ipcidr'));

			return true;
		}

		o = s.option(form.DummyValue, '_value', _('Value'));
		o.load = function(section_id) {
			var option = uci.get(data[0], section_id, 'type');

			switch (option) {
				case 'file':
					return uci.get(data[0], section_id, '.name').replace(new RegExp("^[^_]+_"), '') + '.rule';
				case 'http':
					return uci.get(data[0], section_id, 'url');
				default:
					return null;
			}
		}
		o.modalonly = false;

		o = s.option(form.TextValue, '_editer', _('Editer'),
			_('Please type <a target="_blank" href="https://wiki.metacubex.one/config/rule-providers/content/">Contents</a>.'));
		o.renderWidget = function(/* ... */) {
			var frameEl = form.TextValue.prototype.renderWidget.apply(this, arguments);

			frameEl.firstChild.style.fontFamily = hm.monospacefonts.join(',');

			return frameEl;
		}
		o.placeholder = _('Content will not be verified, Please make sure you enter it correctly.');
		o.rmempty = false;
		o.load = function() {};
		o.write = function() {
			alert('Editer is a development feature');
		};
		o.depends({'type': 'file', 'format': /^(text|yaml)$/});
		o.modalonly = true;

		o = s.option(form.Value, 'url', _('Rule set URL'));
		o.validate = function(section_id, value) {
			try {
				var url = new URL(value);
				if (!url.hostname)
					return _('Expecting: %s').format(_('valid URL'));
			}
			catch(e) {
				return _('Expecting: %s').format(_('valid URL'));
			}

			return true;
		}
		o.rmempty = false;
		o.depends('type', 'http');
		o.modalonly = true;

		o = s.option(form.ListValue, 'proxy', _('Proxy group'),
			_('Name of the Proxy group to download rule set.'));
		o.load = function(section_id) {
			var preadds = [
				['', _('null')],
				['DIRECT', _('DIRECT')]
			];

			return hm.loadProxyGroupLabel(this, preadds, data[0], section_id);
		}
		//o.editable = true;
		o.depends('type', 'http');

		o = s.option(form.Value, 'interval', _('Update interval'),
			_('In seconds. <code>259200</code> will be used if empty.'));
		o.datatype = 'uinteger';
		o.placeholder = '259200';
		o.depends('type', 'http');
		/* Rule set END */

		return m.render();
	}
});
