# FullCombo Mihomo

## Features

- Gateway level Transparent proxy
- Gateway level FullCone NAT
- Access control Whitelist/Blacklist
- Routing control based on Port/IP/FQDN
- Complete DNS hijacking prevents any 53 port query behavior that bypasses the gateway
- DNS requests intelligent routing based on EDNS-Client-Subnet/Policy
- Based on mihomo documentation, fully visual configuration GUI

## Todo

- [ ] Any other improvements

## Known issues

## Screenshots

![global](assets/img/global.png "global")

## Releases

You can find the prebuilt-ipks [here](https://fantastic-packages.github.io/packages/)

## Compatibility with MihomoTProxy

Core:
 + The Mihomo core provided by FullCombo Mihomo only contains binaries and does not have daemons.
 + So in theory you can use the mihomo core provided by MihomoTProxy.

LuCI application:
 + FullCombo Mihomo and MihomoTProxy can be installed on the same device, but cannot be started as clients at the same time.

## Installation

If you have trouble downloading resource files after initial installation, you can upload the [initial resource pack][].

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
