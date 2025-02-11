# FullCombo Shark!

![Releases](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Ffantastic-packages.github.io%2Fpackages%2Freleases%2FSNAPSHOT%2Fpackages%2Fx86_64%2Fluci%2Findex.json&query=%24.packages.luci-app-fchomo&label=releases&style=flat-square&color=73eba0)
[![License](https://img.shields.io/github/license/muink/openwrt-fchomo?style=flat-square)](./LICENSE)
![Stars](https://img.shields.io/github/stars/muink/openwrt-fchomo?style=flat-square&color=ea4aaa)
[![Discussions](https://img.shields.io/github/discussions/muink/openwrt-fchomo?style=flat-square)](https://github.com/muink/openwrt-fchomo/discussions)
[![Static](https://img.shields.io/badge/chat-on%20Telegram-blue?style=flat-square)](https://t.me/fc_shark)
<!-- ![Codesize](https://img.shields.io/github/languages/code-size/muink/openwrt-fchomo?style=flat-square) -->

## Features

- Gateway level Transparent proxy
- Gateway level FullCone NAT
- Access control Whitelist/Blacklist
- Routing control based on Port/IP/FQDN
- Complete DNS hijacking prevents any 53 port query behavior that bypasses the gateway
- DNS requests intelligent routing based on EDNS-Client-Subnet/Policy
- Based on mihomo documentation, fully visual configuration GUI

## Requirements

- OpenWrt >= 23.05
- firewall4

## Known issues

- The **Routing rule** and **Sub rule** of the LuCI app have been migrated from `mihomo` format to `json` format.</br>
  If find `option oldentry` in `/etc/config/fchomo` file, the selected config may not be migrated correctly.</br>
  You need to manually reset the selected config and remove the `oldentry` option when you are done.

## Screenshots

![global](assets/img/global.png "global")

## Releases

You can find the prebuilt-ipks [here](https://fantastic-packages.github.io/packages/)

## Compatibility with Nikki

- FullCombo Shark! and Nikki can be installed on the same device, but cannot be started as clients at the same time.

## Installation

If you have trouble downloading resource files after initial installation, you can upload the [initial resource pack][].

## Example

[bypasscn](./luci-app-fchomo/docs/example/bypasscn.config)</br>
[gfwlist](./luci-app-fchomo/docs/example/gfwlist.config)

## Build

``` bash
# Take the x86_64 platform as an example
tar xjf openwrt-sdk-23.05.3-x86-64_gcc-12.3.0_musl.Linux-x86_64.tar.xz
# Go to the SDK root dir
cd openwrt-sdk-*-x86_64_*
# First run to generate a .config file
make menuconfig
./scripts/feeds update -a
./scripts/feeds install -a
# Get Makefile
git clone --depth 1 --branch master --single-branch --no-checkout https://github.com/muink/openwrt-fchomo.git package/openwrt-fchomo
pushd package/openwrt-fchomo
umask 022
git checkout
popd
# Select the package LuCI -> Applications -> luci-app-fchomo
make menuconfig
# Start compiling
make package/luci-app-fchomo/compile V=s BUILD_LOG=y -j$(nproc)
```

[initial resource pack]: https://github.com/muink/openwrt-fchomo/raw/refs/heads/initialpack/initial.tgz
