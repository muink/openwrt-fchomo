'use strict';
'require baseclass';
'require fs';
'require rpc';
'require ui';

return baseclass.extend({
	getFeatures: function() {
		var callGetFeatures = rpc.declare({
			object: 'luci.fchomo',
			method: 'get_features',
			expect: { '': {} }
		});

		return L.resolveDefault(callGetFeatures(), {});
	},

	getServiceStatus: function(instance) {
		var conf = 'fchomo';
		var callServiceList = rpc.declare({
			object: 'service',
			method: 'list',
			params: ['name'],
			expect: { '': {} }
		});

		return L.resolveDefault(callServiceList(conf), {})
			.then((res) => {
				var isRunning = false;
				try {
					isRunning = res[conf]['instances'][instance].running;
				} catch (e) {}
				return isRunning;
			});
	},

	handleReload: function(ev, sid, instance) {
		var instance = instance || '';
		return fs.exec('/etc/init.d/fchomo', ['reload', instance])
			.then((res) => { return window.location = window.location.href.split('#')[0] })
			.catch((e) => {
				ui.addNotification(null, E('p', _('Failed to execute "/etc/init.d/fchomo %s %s" reason: %s').format('reload', instance, e)))
			})
	}
});
