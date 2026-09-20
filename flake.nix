{
  description = "Apprise Atlas development shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${system};
      in {
        # Optional, never required. The documented path is `bun install`; this shell
        # exists so a contributor who wants pinned tooling can have it.
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
            nodejs_22
            xc
            graphviz # for `depcruise --output-type dot` and future `atlas graph`
          ];

          shellHook = ''
            echo "apprise-atlas dev shell — bun $(bun --version), node $(node --version)"
          '';
        };
      });
}
