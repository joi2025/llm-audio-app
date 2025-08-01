import React from "react";
import {
  QueryClient,
  QueryClientProvider as RQProvider,
} from "@tanstack/react-query";

const queryClient = new QueryClient();

export const QueryProvider = ({ children }) => (
  <RQProvider client={queryClient}>{children}</RQProvider>
);
