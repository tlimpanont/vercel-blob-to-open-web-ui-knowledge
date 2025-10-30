declare module "swagger-ui-react" {
  import { FC } from "react";

  interface SwaggerUIProps {
    spec?: any;
    url?: string;
    docExpansion?: "list" | "full" | "none";
    deepLinking?: boolean;
    displayRequestDuration?: boolean;
    tryItOutEnabled?: boolean;
    filter?: boolean | string;
    layout?: string;
    supportedSubmitMethods?: string[];
    onComplete?: (system: any) => void;
    [key: string]: any;
  }

  const SwaggerUI: FC<SwaggerUIProps>;
  export default SwaggerUI;
}

declare module "swagger-ui-react/swagger-ui.css" {
  const content: any;
  export default content;
}
