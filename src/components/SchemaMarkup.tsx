import { Helmet } from "react-helmet-async";

interface SchemaMarkupProps {
  data: Record<string, unknown>;
}

/**
 * Component to inject structured data (JSON-LD) into the page <head>.
 * This helps search engines understand the content and enables rich results.
 */
const SchemaMarkup = ({ data }: SchemaMarkupProps) => {
  if (!data) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
};

export default SchemaMarkup;
