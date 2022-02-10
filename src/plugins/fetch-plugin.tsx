import * as esbuild from "esbuild-wasm";
import axios from "axios";
import localForage from "localforage";

const fileCache = localForage.createInstance({
  name: "filecache",
});

export const fetchPlugin = (inputCode: string) => {
  //plugins export objects with name property and a setup function
  return {
    name: "fetch-plugin",
    setup(build: esbuild.PluginBuild) {
      //intercept the onLoad call to hit unpkg instead of file system
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        if (args.path === "index.js") {
          return {
            loader: "jsx",
            contents: inputCode,
          };
        }

        //Check if file is already in cache
        const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
          args.path
        );

        //if yes, return
        if (cachedResult) {
          return cachedResult;
        }

        const { data, request } = await axios.get(args.path);

        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents: data,
          //resolveDir passes along where the pkg was found
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        //else store response in cache
        await fileCache.setItem(args.path, result);
        return result;
      });
    },
  };
};
