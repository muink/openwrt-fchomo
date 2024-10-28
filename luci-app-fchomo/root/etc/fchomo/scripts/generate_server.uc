#!/usr/bin/ucode

'use strict';

import { cursor } from 'uci';

import {
	isEmpty, strToBool, strToInt,
	removeBlankAttrs,
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

		/* HTTP / SOCKS */
		users: (cfg.type in ['http', 'socks', 'mixed']) ? parse_users(cfg.users) : null,

		/* Shadowsocks */
		cipher: cfg.shadowsocks_chipher,
		password: cfg.shadowsocks_password,
	});
});
/* Inbound END */

printf('%.J\n', removeBlankAttrs(config));
