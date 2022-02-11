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
    //intercept the onLoad call to hit unpkg instead of file system
    setup(build: esbuild.PluginBuild) {
      //return the index.js file
      build.onLoad({ filter: /(^index\.js$)/ }, () => {
        return {
          loader: "jsx",
          contents: inputCode,
        };
      });

      //Return early for cached
      build.onLoad({ filter: /.*/ }, async (args: any) => {
        const cachedResult = await fileCache.getItem<esbuild.OnLoadResult>(
          args.path
        );

        if (cachedResult) {
          return cachedResult;
        }
      });

      //return the css code as a style element
      build.onLoad({ filter: /.css$/ }, async (args: any) => {
        const { data, request } = await axios.get(args.path);

        const escaped = data
          //remove newlines
          .replace(/\n/g, "")
          //escape double quotes
          .replace(/"/g, '\\"')
          //escape single quotes
          .replace(/'/g, "\\'");
        const contents = `
            const style = document.creatElement('style');
            style.innerText = '${escaped}';
            document.head.appendChild(style);
            `;

        const result: esbuild.OnLoadResult = {
          loader: "jsx",
          contents,
          //resolveDir passes along where the pkg was found
          resolveDir: new URL("./", request.responseURL).pathname,
        };

        //else store response in cache
        await fileCache.setItem(args.path, result);
        return result;
      });
      build.onLoad({ filter: /.*/ }, async (args: any) => {
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
