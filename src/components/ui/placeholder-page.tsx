type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
  );
}
