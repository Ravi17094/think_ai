const { withAppDelegate } = require("@expo/config-plugins");

// Expo prebuild regenerates AppDelegate, so preserve RNFS background completion
// registration through a config plugin rather than editing a generated file.
module.exports = (config) =>
  withAppDelegate(config, (mod) => {
    const delegate = mod.modResults;
    if (!delegate.language.startsWith("objc"))
      throw new Error(
        "Patan downloads currently require an Objective-C AppDelegate.",
      );
    if (
      !delegate.contents.includes(
        "[RNFSManager setCompletionHandlerForIdentifier:",
      )
    ) {
      if (!delegate.contents.includes("@end"))
        throw new Error(
          "Could not install RNFS background completion handler.",
        );
      delegate.contents = "#import <RNFSManager.h>\n" + delegate.contents;
      delegate.contents = delegate.contents.replace(
        /@end\s*$/,
        `- (void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler
{
  [RNFSManager setCompletionHandlerForIdentifier:identifier completionHandler:completionHandler];
}
@end\n`,
      );
    }
    return mod;
  });
