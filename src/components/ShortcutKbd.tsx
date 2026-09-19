type Props = {
  hint: string;
  className?: string;
};

export function ShortcutKbd({ hint, className }: Props) {
  return <kbd className={className ? `nav-kbd ${className}` : "nav-kbd"}>{hint}</kbd>;
}
