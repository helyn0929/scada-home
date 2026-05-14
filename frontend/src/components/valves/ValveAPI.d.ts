export declare const ValveAPI: {
  binary(id: string, open: boolean | undefined, root: Element): void;
  ControlDN1350(
    data: { open: boolean; percent?: number } | undefined,
    root: Element
  ): void;
  flow(id: string, active: boolean, root: Element): void;
};
