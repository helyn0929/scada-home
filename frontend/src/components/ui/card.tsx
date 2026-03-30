import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={[
        "rounded-xl border border-white/10 bg-neutral-800 text-neutral-100 shadow-sm",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={["p-6", className].join(" ")} {...props} />;
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return (
    <h3 className={["text-lg font-semibold leading-none", className].join(" ")} {...props} />
  );
}

export function CardDescription({ className = "", ...props }: DivProps) {
  return (
    <p className={["text-sm text-neutral-400", className].join(" ")} {...props} />
  );
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={["p-6 pt-0", className].join(" ")} {...props} />;
}

export function CardFooter({ className = "", ...props }: DivProps) {
  return <div className={["p-6 pt-0", className].join(" ")} {...props} />;
}

export default Card;
