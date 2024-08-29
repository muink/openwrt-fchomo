include $(TOPDIR)/rules.mk

LUCI_TITLE:=Fully custom luci app of mihomo on OpenWrt
LUCI_PKGARCH:=all
LUCI_DEPENDS:= \
	+mihomo \
	+ca-bundle \
	+firewall4 +dnsmasq-full \
	+kmod-nft-tproxy \
	+ip-full +kmod-tun \
	+curl +yq

PKG_NAME:=luci-app-fchomo

define Package/luci-app-fchomo/conffiles
/etc/config/fchomo
/etc/fchomo/certs/
/etc/fchomo/provider/
/etc/fchomo/ruleset/
/etc/fchomo/resources/
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
