import { createThirdwebClient } from "thirdweb";

// Extract this to your .env.local file in production!
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "bebfbdb23ed411d19174cced18c4deb2";

export const client = createThirdwebClient({
  clientId: clientId,
});