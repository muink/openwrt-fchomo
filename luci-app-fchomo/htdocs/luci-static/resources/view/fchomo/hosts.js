'use strict';
'require view';
'require fs';
'require ui';

'require fchomo as hm';

const hostspath = '/etc/fchomo/templates/hosts.yaml'

var isReadonlyView = !L.hasViewPermission() || null;

return view.extend({
	load: function() {
		return L.resolveDefault(fs.read(hostspath), '');
	},

	handleSave: function(ev) {
		var value = (document.querySelector('textarea').value || '').trim().replace(/\r\n/g, '\n') + '\n';

		return fs.write(hostspath, value).then(function(rc) {
			document.querySelector('textarea').value = value;
			ui.addNotification(null, E('p', _('Contents have been saved.')), 'info');
		}).catch(function(e) {
			ui.addNotification(null, E('p', _('Unable to save contents: %s').format(e.message)));
		});
	},

	render: function(content) {
		return E([
			E('h2', _('Hosts')),
			E('p', { 'class': 'cbi-section-descr' }, _('Custom internal hosts. Support <code>yaml</code> or <code>json</code> format.')),
			E('p', {}, E('textarea', {
				'class': 'cbi-input-textarea',
				'style': 'width:100%;font-family:' + hm.monospacefonts.join(','),
				'rows': 25,
				'disabled': isReadonlyView
			}, [ content ? content : 'hosts:\n' ]))
		]);
	},

	handleSaveApply: null,
	handleReset: null
});
