include $(TOPDIR)/rules.mk

LUCI_TITLE:=Fully custom luci app of mihomo on OpenWrt
LUCI_PKGARCH:=all
LUCI_DEPENDS:= \
	+mihomo \
	+ca-bundle \
	+firewall4 \
	+kmod-nft-tproxy \
	+curl +yq \
#	+ip-full +kmod-tun +dnsmasq-full \

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
