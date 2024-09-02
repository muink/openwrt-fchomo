#!/bin/bash

set -o errexit
set -o pipefail

if grep -q '^darwin*' <<< "$OSTYPE"; then
	export PATH="$(brew --prefix)/opt/coreutils/libexec/gnubin:$(brew --prefix)/opt/gnu-sed/libexec/gnubin:$(brew --prefix)/opt/findutils/libexec/gnubin:$(brew --prefix)/opt/gnu-tar/libexec/gnubin:$PATH"
fi

export PKG_SOURCE_DATE_EPOCH="$(date "+%s")"

BASE_DIR="$(cd "$(dirname $0)"; pwd)"
PKG_DIR="$BASE_DIR/../luci-app-fchomo"

PKG_NAME=luci-app-fchomo
PKG_VERSION="dev-$PKG_SOURCE_DATE_EPOCH-$(git rev-parse --short HEAD)"

TEMP_DIR="$(mktemp -d -p $BASE_DIR 2>/dev/null || mktemp -d)"
TEMP_PKG_DIR="$TEMP_DIR/$PKG_NAME"
mkdir -p "$TEMP_PKG_DIR/CONTROL/"
mkdir -p "$TEMP_PKG_DIR/lib/upgrade/keep.d/"
mkdir -p "$TEMP_PKG_DIR/www/"

cp -fpR "$PKG_DIR/htdocs"/* "$TEMP_PKG_DIR/www/"
cp -fpR "$PKG_DIR/root"/* "$TEMP_PKG_DIR/"

echo -e "/etc/config/fchomo" > "$TEMP_PKG_DIR/CONTROL/conffiles"
cat > "$TEMP_PKG_DIR/lib/upgrade/keep.d/$PKG_NAME" <<-EOF
/etc/fchomo/certs/
/etc/fchomo/ruleset/
/etc/fchomo/resources/direct_list.txt
/etc/fchomo/resources/proxy_list.txt
EOF

cat > "$TEMP_PKG_DIR/CONTROL/control" <<-EOF
	Package: $PKG_NAME
	Version: $PKG_VERSION
	Depends: libc, mihomo, ca-bundle, firewall4, kmod-nft-tproxy, curl, yq
	Source: https://github.com/muink/openwrt-fchomo
	SourceName: $PKG_NAME
	Section: luci
	SourceDateEpoch: $PKG_SOURCE_DATE_EPOCH
	Maintainer: Anya Lin <hukk1996@gmail.com>
	Architecture: all
	Installed-Size: TO-BE-FILLED-BY-IPKG-BUILD
	Description: 
EOF

echo -e '#!/bin/sh
[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0
[ -s ${IPKG_INSTROOT}/lib/functions.sh ] || exit 0
. ${IPKG_INSTROOT}/lib/functions.sh
default_postinst $0 $@' > "$TEMP_PKG_DIR/CONTROL/postinst"
chmod 0755 "$TEMP_PKG_DIR/CONTROL/postinst"

echo -e "[ -n "\${IPKG_INSTROOT}" ] || {
	(. /etc/uci-defaults/$PKG_NAME) && rm -f /etc/uci-defaults/$PKG_NAME
	rm -f /tmp/luci-indexcache
	rm -rf /tmp/luci-modulecache/
	exit 0
}" > "$TEMP_PKG_DIR/CONTROL/postinst-pkg"
chmod 0755 "$TEMP_PKG_DIR/CONTROL/postinst-pkg"

echo -e '#!/bin/sh
[ -s ${IPKG_INSTROOT}/lib/functions.sh ] || exit 0
. ${IPKG_INSTROOT}/lib/functions.sh
default_prerm $0 $@' > "$TEMP_PKG_DIR/CONTROL/prerm"
chmod 0755 "$TEMP_PKG_DIR/CONTROL/prerm"

curl -fsSL "https://raw.githubusercontent.com/openwrt/openwrt/master/scripts/ipkg-build" -o "$TEMP_DIR/ipkg-build"
chmod 0755 "$TEMP_DIR/ipkg-build"
"$TEMP_DIR/ipkg-build" -m "" "$TEMP_PKG_DIR" "$TEMP_DIR"

mv "$TEMP_DIR/${PKG_NAME}_${PKG_VERSION}_all.ipk" "$BASE_DIR/${PKG_NAME}_${PKG_VERSION}_all.ipk"
rm -rf "$TEMP_DIR"
