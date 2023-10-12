import { features, type CategoryLabels, type Flags } from "@batijs/features";
import { execRules } from "@batijs/features/rules";
import { batch, createContext, createMemo, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import type { Definition, Feature } from "../types.js";
import { rulesMessages } from "./RulesMessages.js";

function filteredObject<T extends object>(obj: T, filter: (obj: T, k: keyof T) => boolean) {
  return Object.keys(obj).reduce(function (r, e) {
    if (filter(obj, e as keyof T)) r[e as keyof T] = obj[e as keyof T];
    return r;
  }, {} as Partial<T>);
}

function initStore() {
  const definitions = features.reduce(
    (acc, curr: Feature) => {
      let selected = false;
      if (!(curr.category in acc)) {
        acc[curr.category as CategoryLabels] = {
          disabled: Boolean(curr.disabled),
          inview: false,
          label: curr.category as CategoryLabels,
          features: [],
        };
        selected = true;
      }

      acc[curr.category as CategoryLabels].features.push({
        ...curr,
        value: curr.flag,
        alt: curr.disabled ? "Coming soon" : undefined,
        selected,
      });

      return acc;
    },
    {} as Record<CategoryLabels, Definition>,
  );

  const [currentFeatures, setCurrentFeatures] = createStore<Record<CategoryLabels, Definition>>(definitions);

  const inViewFeatures = createMemo(() => filteredObject(currentFeatures, (o, k) => Boolean(o[k].inview)));

  function moveFeature(k: CategoryLabels) {
    setCurrentFeatures(k, "inview", (val) => !val);
  }

  function selectFeature(k: CategoryLabels, value: unknown) {
    setCurrentFeatures(k, "features", (fs) => {
      return fs.map((f) => ({
        ...f,
        selected: value ? value === f.value : definitions[k].features.find((f2) => f2.value === f.value)?.selected,
      }));
    });
  }

  const featuresValues = createMemo<Record<string, string | undefined>>(() =>
    Object.assign(
      {},
      ...Object.entries(inViewFeatures()).map(([ns, fs]) => ({
        [ns]: fs.features.find((f) => f.selected)?.value,
      })),
    ),
  );

  const selectedFeatures = createMemo<Feature[]>(
    () =>
      Object.values(inViewFeatures())
        .map((fs) => fs.features.find((f) => f.selected))
        .filter(Boolean) as Feature[],
  );

  function selectPreset(ks: (Flags | CategoryLabels)[]) {
    const activeCategories = new Set<string>();
    const activeFeatures: Feature[] = [];
    for (const [category, defs] of Object.entries(definitions)) {
      if (ks.includes(category as CategoryLabels)) {
        activeCategories.add(category);
      } else {
        for (const feat of defs.features) {
          if (ks.includes(feat.flag as Flags)) {
            activeCategories.add(category);
            activeFeatures.push(feat);
          }
        }
      }
    }

    batch(() => {
      (Object.keys(currentFeatures) as CategoryLabels[]).forEach((k) => {
        setCurrentFeatures(k, "inview", activeCategories.has(k));
      });
      activeFeatures.forEach((ft) => {
        selectFeature(ft.category as CategoryLabels, ft.flag);
      });
    });
  }

  const inViewFlags = createMemo<Flags[]>(
    () =>
      Object.values(inViewFeatures())
        .map((fs) => fs.features.filter((f) => f.selected).map((f) => f.flag))
        .flat(1)
        .filter(Boolean) as Flags[],
  );

  const rules = createMemo(() => {
    const r = execRules(inViewFlags(), rulesMessages);

    return {
      size: r.length,
      error: r.filter((x) => x.type === "error").map((x) => x.value),
      warning: r.filter((x) => x.type === "warning").map((x) => x.value),
      info: r.filter((x) => x.type === "info").map((x) => x.value),
    };
  });

  return {
    inViewFeatures,
    moveFeature,
    selectFeature,
    featuresValues,
    selectedFeatures,
    currentFeatures,
    selectPreset,
    inViewFlags,
    rules,
  };
}

export const StoreContext = createContext<ReturnType<typeof initStore>>(
  undefined as unknown as ReturnType<typeof initStore>,
);

export function StoreProvider(props: { children: JSX.Element }) {
  const store = initStore();

  return <StoreContext.Provider value={store}>{props.children}</StoreContext.Provider>;
}