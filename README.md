# FullCombo Mihomo

## Todo

- [ ] node
- [ ] dialer-proxy
- [ ] Any other improvements

## Known issues

## Screenshots

![global](assets/img/global.png "global")

## Releases

You can find the prebuilt-ipks [here](https://fantastic-packages.github.io/packages/)

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
