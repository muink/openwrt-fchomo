#!/usr/bin/ucode

'use strict';

import { readfile, writefile } from 'fs';
import { cursor } from 'uci';

import {
	isEmpty, strToBool, strToInt,
	removeBlankAttrs,
	HM_DIR, RUN_DIR
} from 'fchomo';

/* UCI config START */
const uci = cursor();

const uciconf = 'fchomo';
uci.load(uciconf);

const ucifchm = 'config',
      ucires = 'resources';

const uciglobal = 'global',
      ucitls = 'tls',
      uciapi = 'api',
      ucisniffer = 'sniffer',
      uciexpr = 'experimental';

const ucisniff = 'sniff';

/* UCI config END */

/* Main */
const config = {};

/* General START */
/* General settings */
config["global-ua"] = 'clash.meta';
config.mode = uci.get(uciconf, uciglobal, 'mode') || 'rule';
config["find-process-mode"] = uci.get(uciconf, uciglobal, 'find_process_mode') || 'off';
config["log-level"] = uci.get(uciconf, uciglobal, 'log_level') || 'warning';
config.ipv6 = (uci.get(uciconf, uciglobal, 'ipv6') === '0') ? false : true;
config["unified-delay"] = strToBool(uci.get(uciconf, uciglobal, 'unified_delay')) || false;
config["tcp-concurrent"] = strToBool(uci.get(uciconf, uciglobal, 'tcp_concurrent')) || false;
config["keep-alive-interval"] = strToInt(uci.get(uciconf, uciglobal, 'keep_alive_interval')) || 120;

/* Global Authentication */
config.authentication = uci.get(uciconf, uciglobal, 'authentication');
config["skip-auth-prefixes"] = uci.get(uciconf, uciglobal, 'skip_auth_prefixes');
/* General END */

/* GEOX START */
/* GEOX settings */
config["geodata-mode"] = true;
config["geodata-loader"] = 'memconservative';
config["geo-auto-update"] = false;
/* GEOX END */

/* TLS START */
/* TLS settings */
config["global-client-fingerprint"] = uci.get(uciconf, ucitls, 'global_client_fingerprint');
config.tls = {
	"certificate": uci.get(uciconf, ucitls, 'tls_cert_path'),
	"private-key": uci.get(uciconf, ucitls, 'tls_key_path')
};
/* TLS END */

/* API START */
const api_port = uci.get(uciconf, uciapi, 'external_controller_port');
const api_tls_port = uci.get(uciconf, uciapi, 'external_controller_tls_port');
const dashboard_repo = uci.get(uciconf, uciapi, 'dashboard_repo');
if (dashboard_repo) {
	system('rm -rf ' + RUN_DIR + '/ui');
	const dashpkg = HM_DIR + '/resources/' + lc(replace(dashboard_repo, /\W/g, '_')) + '.tgz';
	system('tar -xzf ' + dashpkg + ' -C ' + RUN_DIR + '/');
	system('mv ' + RUN_DIR + '/*-gh-pages/ ' + RUN_DIR + '/ui/');
};
/* API settings */
config["external-controller"] = api_port ? '[::]:' + api_port : null;
config["external-controller-tls"] = api_tls_port ? '[::]:' + api_tls_port : null;
config["external-doh-server"] = uci.get(uciconf, uciapi, 'external_doh_server');
config.secret = uci.get(uciconf, uciapi, 'secret') || trim(readfile('/proc/sys/kernel/random/uuid'));
config["external-ui"] = RUN_DIR + '/ui';
/* API END */

/* Cache START */
/* Cache settings */
config.profile = {
	"store-selected": true,
	"store-fake-ip": false
};
/* Cache END */

/* Sniffer START */
/* Sniffer settings */
config.sniffer = {
	enable: true,
	"force-dns-mapping": true,
	"parse-pure-ip": true,
	"override-destination": (uci.get(uciconf, ucisniffer, 'override_destination') === '0') ? false : true,
	sniff: {},
	"force-domain": uci.get(uciconf, ucisniffer, 'force_domain'),
	"skip-domain": uci.get(uciconf, ucisniffer, 'skip_domain')
};
/* Sniff protocol settings */
uci.foreach(uciconf, ucisniff, (cfg) => {
	if (cfg.enabled === '0')
		return null;

	config.sniffer.sniff[cfg.protocol] = {
		ports: map(cfg.ports, (ports) => {
			return strToInt(ports); // DEBUG ERROR data type *utils.IntRanges[uint16]
		}),
		"override-destination": (cfg.override_destination === '0') ? false : true
	};
});
/* Sniffer END */

/* Experimental START */
/* Experimental settings */
config.experimental = {
	"quic-go-disable-gso": strToBool(uci.get(uciconf, uciexpr, 'quic_go_disable_gso')),
	"quic-go-disable-ecn": strToBool(uci.get(uciconf, uciexpr, 'quic_go_disable_ecn')),
	"dialer-ip4p-convert": strToBool(uci.get(uciconf, uciexpr, 'dialer_ip4p_convert'))
};
/* Experimental END */

printf('%.J\n', config);
