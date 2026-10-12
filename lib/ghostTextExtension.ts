import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface GhostTextState {
  pos: number | null;
  text: string;
}

export const ghostTextPluginKey = new PluginKey<GhostTextState>("ghostText");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ghostText: {
      setGhostText: (text: string, pos?: number) => ReturnType;
      clearGhostText: () => ReturnType;
    };
  }
}

export const GhostTextExtension = Extension.create({
  name: "ghostText",

  addCommands() {
    return {
      setGhostText:
        (text: string, pos?: number) =>
        ({ tr, dispatch, state }) => {
          if (dispatch) {
            const targetPos = typeof pos === "number" ? Math.min(pos, state.doc.content.size) : state.selection.from;
            tr.setMeta(ghostTextPluginKey, { pos: targetPos, text });
            dispatch(tr);
          }
          return true;
        },

      clearGhostText:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(ghostTextPluginKey, { pos: null, text: "" });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<GhostTextState>({
        key: ghostTextPluginKey,
        state: {
          init: () => ({ pos: null, text: "" }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(ghostTextPluginKey) as GhostTextState | undefined;
            if (meta !== undefined) {
              return meta;
            }
            if (prev.pos !== null) {
              const mappedPos = tr.mapping.map(prev.pos);
              return { pos: mappedPos, text: prev.text };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = ghostTextPluginKey.getState(state);
            if (!pluginState || pluginState.pos === null || !pluginState.text) {
              return DecorationSet.empty;
            }

            const docSize = state.doc.content.size;
            const safePos = Math.min(pluginState.pos, docSize);

            const widget = Decoration.widget(
              safePos,
              () => {
                const span = document.createElement("span");
                span.className =
                  "pointer-events-none select-none text-[var(--color-ink-muted)] opacity-55 transition-opacity duration-150 inline";
                span.setAttribute("aria-hidden", "true");
                span.textContent = pluginState.text;
                return span;
              },
              { side: 1, key: "ghost-dictation-widget" }
            );

            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});
