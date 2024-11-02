#!/usr/bin/ucode

'use strict';

import { cursor } from 'uci';

import {
	isEmpty, strToBool, strToInt,
	arrToObj, removeBlankAttrs,
	HM_DIR, RUN_DIR, PRESET_OUTBOUND
} from 'fchomo';

/* UCI config START */
const uci = cursor();

const uciconf = 'fchomo';
uci.load(uciconf);

const uciserver = 'server';

/* UCI config END */

/* Config helper START */
function parse_users(cfg) {
	if (isEmpty(cfg))
		return null;

	let uap, arr, users=[];
	for (uap in cfg) {
		arr = split(uap, ':');
		users[arr[0]] = arr[1];
	}

	return users;
}
/* Config helper END */

/* Main */
const config = {};

/* Inbound START */
config.listeners = [];
uci.foreach(uciconf, uciserver, (cfg) => {
	if (cfg.enabled === '0')
		return;

	push(config.listeners, {
		name: cfg['.name'],
		type: cfg.type,

		listen: cfg.listen || '::',
		port: strToInt(cfg.port),
		udp: strToBool(cfg.udp),

		/* Shadowsocks */
		cipher: cfg.shadowsocks_chipher,
		password: cfg.shadowsocks_password,

		/* HTTP / SOCKS / VMess / Tuic / Hysteria2 */
		users: (cfg.type in ['http', 'socks', 'mixed', 'vmess', 'tuic', 'hysteria2']) ? [
			{
				/* HTTP / SOCKS / Hysteria2 */
				...arrToObj([[cfg.username, cfg.password]]),

				/* Tuic */
				...arrToObj([[cfg.uuid, cfg.password]]),

				/* VMess */
				uuid: cfg.vmess_uuid,
				alterId: strToInt(cfg.vmess_alterid)
			}
		] : null,
	});
});
/* Inbound END */

printf('%.J\n', removeBlankAttrs(config));
