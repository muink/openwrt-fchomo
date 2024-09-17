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
      uciinbound = 'inbound',
      ucitls = 'tls',
      uciapi = 'api',
      ucisniffer = 'sniffer',
      uciexpr = 'experimental';

const uciclient = 'client',
      ucidns = 'dns';

const ucisniff = 'sniff',
      ucidnser = 'dns_server',
      ucidnspoli = 'dns_policy';

/* Hardcode options */
const tun_name = uci.get(uciconf, ucifchm, 'tun_name') || 'hmtun0',
      tun_addr4 = uci.get(uciconf, ucifchm, 'tun_addr4') || '198.19.0.1/30',
      tun_addr6 = uci.get(uciconf, ucifchm, 'tun_addr6') || 'fdfe:dcba:9877::1/126',
      route_table_id = strToInt(uci.get(uciconf, ucifchm, 'route_table_id')) || 2022,
      route_rule_pref = strToInt(uci.get(uciconf, ucifchm, 'route_rule_pref')) || 9000,
	  redirect_gate_mark = 2023,
	  redirect_pass_mark = 2024,
      posh = 'c2luZ2JveA';

/* All DNS server object */
const dnsservers = {};
uci.foreach(uciconf, ucidnser, (cfg) => {
	if (cfg.enabled === '0')
		return;

	dnsservers[cfg['.name']] = {
		label: cfg.label,
		address: cfg.address
	};
});

/* UCI config END */

/* Config helper START */
function get_nameserver(cfg) {
	if (isEmpty(cfg))
		return [];

	if ('block-dns' in cfg)
		//https://github.com/MetaCubeX/mihomo/blob/0128a0bb1fce17d39158c745a912d7b2b87cf975/config/config.go#L1131
		return 'rcode://name_error';

	let servers = [];
	for (let k in cfg) {
		if (k === 'system-dns') {
			push(servers, 'system');
		} else if (k === 'default-dns') {
			push(servers, '114.114.114.114#DIRECT');
		} else
			push(servers, dnsservers[k]?.address);
	}

	return servers;
}
/* Config helper END */

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

/* Experimental START */
/* Experimental settings */
config.experimental = {
	"quic-go-disable-gso": strToBool(uci.get(uciconf, uciexpr, 'quic_go_disable_gso')),
	"quic-go-disable-ecn": strToBool(uci.get(uciconf, uciexpr, 'quic_go_disable_ecn')),
	"dialer-ip4p-convert": strToBool(uci.get(uciconf, uciexpr, 'dialer_ip4p_convert'))
};
/* Experimental END */

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

/* Inbound START */
const proxy_mode = uci.get(uciconf, uciinbound, 'proxy_mode') || 'redir_tproxy';
/* Listen ports */
config.listeners = [];
push(config.listeners, {
	name: 'dns-in',
	type: 'tunnel',
	port: strToInt(uci.get(uciconf, uciinbound, 'tunnel_port')) || '7793',
	listen: '::',
	network: ['tcp', 'udp'],
	target: '1.1.1.1:53'
});
push(config.listeners, {
	name: 'mixed-in',
	type: 'mixed',
	port: strToInt(uci.get(uciconf, uciinbound, 'mixed_port')) || '7790',
	listen: '::',
	udp: true
});
if (match(proxy_mode, /redir/))
	push(config.listeners, {
		name: 'redir-in',
		type: 'redir',
		port: strToInt(uci.get(uciconf, uciinbound, 'redir_port')) || '7791',
		listen: '::'
	});
if (match(proxy_mode, /tproxy/))
	push(config.listeners, {
		name: 'tproxy-in',
		type: 'tproxy',
		port: strToInt(uci.get(uciconf, uciinbound, 'tproxy_port')) || '7792',
		listen: '::',
		udp: true
	});
/* Tun settings */
if (match(proxy_mode, /tun/))
	push(config.listeners, {
		name: 'tun-in',
		type: 'tun',

		device: tun_name,
		stack: uci.get(uciconf, uciinbound, 'tun_stack') || 'system',
		"dns-hijack": ['udp://[::]:53', 'tcp://[::]:53'],
		"inet4-address": [ tun_addr4 ],
		"inet6-address": [ tun_addr6 ],
		mtu: strToInt(uci.get(uciconf, uciinbound, 'tun_mtu')) || 9000,
		gso: strToBool(uci.get(uciconf, uciinbound, 'tun_gso')) || false,
		"gso-max-size": strToInt(uci.get(uciconf, uciinbound, 'tun_gso_max_size')) || 65536,
		"auto-route": false,
		"iproute2-table-index": route_table_id,
		"iproute2-rule-index": route_rule_pref,
		"auto-redirect": false,
		"auto-redirect-input-mark": redirect_gate_mark,
		"auto-redirect-output-mark": redirect_pass_mark,
		"strict-route": false,
		"route-address": [
			"0.0.0.0/1",
			"128.0.0.0/1",
			"::/1",
			"8000::/1"
		],
		"route-exclude-address": [
			"192.168.0.0/16",
			"fc00::/7"
		],
		"route-address-set": [],
		"route-exclude-address-set": [],
		"include-interface": [],
		"exclude-interface": [],
		"udp-timeout": strToInt(uci.get(uciconf, uciinbound, 'tun_udp_timeout')) || 300,
		"endpoint-independent-nat": strToBool(uci.get(uciconf, uciinbound, 'tun_endpoint_independent_nat')),
		"auto-detect-interface": true
	});
/* Inbound END */

/* DNS START */
/* DNS settings */
config.dns = {
	enable: true,
	"prefer-h3": false,
	listen: '[::]:' + (uci.get(uciconf, ucidns, 'port') || '7753'),
	ipv6: (uci.get(uciconf, ucidns, 'ipv6') === '0') ? false : true,
	"enhanced-mode": 'redir-host',
	"use-hosts": true,
	"use-system-hosts": true,
	"respect-rules": true,
	"default-nameserver": get_nameserver(uci.get(uciconf, ucidns, 'boot_server')),
	"proxy-server-nameserver": get_nameserver(uci.get(uciconf, ucidns, 'bootnode_server')),
	nameserver: get_nameserver(uci.get(uciconf, ucidns, 'default_server')),
	fallback: get_nameserver(uci.get(uciconf, ucidns, 'fallback_server')),
	"nameserver-policy": {},
	"fallback-filter": {}
};
/* DNS policy */
uci.foreach(uciconf, ucidnspoli, (cfg) => {
	if (cfg.enabled === '0')
		return null;

	let key;
	if (cfg.type === 'domain') {
		key = isEmpty(cfg.domain) ? null : join(',', cfg.domain);
	} else if (cfg.type === 'geosite') {
		key = isEmpty(cfg.geosite) ? null : 'geosite:' + join(',', cfg.geosite);
	} else if (cfg.type === 'rule_set') {
		key = isEmpty(cfg.rule_set) ? null : 'rule-set:' + join(',', cfg.rule_set);
	};

	if (!key)
		return null;

	config.dns["nameserver-policy"][key] = get_nameserver(cfg.server);
});
/* Fallback filter */
/* DNS END */

/* Hosts START */
/* Hosts */
config.hosts = {};
/* Hosts END */

printf('%.J\n', config);
