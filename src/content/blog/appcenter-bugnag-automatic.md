---
title: "App Center + Bugsnag with React Native. The right (automatic) way"
publishedAt: 2020-06-13
excerpt: "A custom script to automatically upload the source maps to Bugsnag from Appcenter. Works for android and iOS."
mainImage:
  src: "/images/blog/appcenter-bugsnag-hero.jpg"
  alt: "Man with a bug in his hand"
---

> **Note:** AppCenter was deprecated by Microsoft in March 2025. This post is preserved as an archive. The CI/CD patterns described here still apply to other platforms.

> **TLDR:** [Add this file to your root folder](https://gist.github.com/jorgemasta/41862f tried4ea0f82b9fb4ff53d5e38d2)

We are cool people, so we have our continuous deployment system and our bug tracker working but when the bugs come we see that they really suck...

![Random useless error](/images/blog/useless-error.png)

We forgot a **very** important last step, generating and uploading our javascript source maps to our error tracker, in this case Bugsnag. Without these source maps, Bugsnag only has a minified javascript file that gives us very useless errors.

Bugsnag has ~~good~~ decent documentation that shows us how to generate and upload the source maps. In short, we must create a bundle for both iOS and android and upload them separately.

```bash
# 1. Generate **Android** source maps
npx react-native bundle \
--platform android \
--dev false \
--entry-file index.js \
--bundle-output release.bundle \
--sourcemap-output release.bundle.map

# 2. Upload **Android** source maps to Bugsnag
curl --http1.1 https://upload.bugsnag.com/react-native-source-map \
-F apiKey=YOUR_API_KEY \
-F appVersionCode=YOUR_APP_VERSION_CODE \
-F dev=false \
-F platform=android \
-F sourceMap=@release.bundle.map \
-F bundle=@release.bundle \
-F projectRoot=`pwd`

# 3. Generate **iOS** source maps
npx react-native bundle \
--platform ios \
--dev false \
--entry-file index.js \
--bundle-output release.bundle \
--sourcemap-output release.bundle.map

# 4. Upload **iOS** source maps to Bugsnag
curl --http1.1 https://upload.bugsnag.com/react-native-source-map \
-F apiKey=YOUR_API_KEY \
-F appBundleVersion=YOUR_APP_BUNDLE_VERSION \
-F dev=false \
-F platform=ios \
-F sourceMap=@release.bundle.map \
-F bundle=@release.bundle \
-F projectRoot=`pwd`
```

*You can check the source maps you uploaded at 'Project Settings - Manage JavaScript source maps'*

**Tada!** We'll start to see our error with a much better trace.

![Random useful error](/images/blog/useful-error.png)

That's nice but we need to do that in every release. Manual and repeated work... sound perfect to be included in our CI system. In this case we are using App Center so we can use Build scripts, exactly the [post-build script](https://docs.microsoft.com/en-us/appcenter/build/custom/scripts/#post-build), to manage this.

We have to save the `appcenter-post-build.sh` file in our repo so it will be the same for both Android and iOS and because we have to execute different steps depending on the platform, **we need a way to know on which platform we are running the script**. I haven't found an elegant way to do this, so I just check if the variable `APPCENTER_ANDROID_VARIANT` exists to know if we are on android or not.

```bash
if [ -n "$APPCENTER_ANDROID_VARIANT" ];
then
PLATFORM='android'
else
PLATFORM='ios'
fi
```

I also want to generate and upload the source maps if I'm in specific branches, so I have to add this small fragment at the beginning of the script to run it only in `production`, `qa` or `staging`.

```bash
if [ "$APPCENTER_BRANCH" != "production" ] && [ "$APPCENTER_BRANCH" != "qa" ] && [ "$APPCENTER_BRANCH" != "staging" ]
then
echo "This branch is not in the selected ones:" $APPCENTER_BRANCH
exit
fi
```

## Wrapping everything up

If we put all the above together, we get this file that automates the process of generating and uploading the source maps.

[Link to the gist](https://gist.github.com/jorgemasta/41862f4ea0f82b9fb4ff53d5e38d2)
