import RecipeClient from './RecipeClient';

// Static Params for GitHub Pages (Pre-render Demo)
export function generateStaticParams() {
  return [
    { id: 'GNGGWBWkRbE' }, // Demo Recipe
  ];
}

// Since we are using export output, this page component receives params prop
// Note: In Next.js 15+, params is a Promise, but in Next.js 14 it's just props.
// Let's assume params is standard prop for now based on the previous code.
// Actually, for generateStaticParams, it's safe to type it.

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: PageProps) {
  // Await params if using newer Next.js versions (good practice)
  const { id } = await params;

  return <RecipeClient id={id} />;
}
