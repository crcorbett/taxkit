import {
  CalculatorCatalogItem,
  CalculatorCatalogResponse,
  CalculatorGraphResponse,
  CalculatorRunResponse,
  CalculatorSchemaResponse,
  FactsResponse,
  JurisdictionsResponse,
  RulesResponse,
  TaxYearsResponse,
} from "@taxkit/calculators/schemas";
import { Rpc, RpcGroup } from "effect/rpc";

import { DocsRpcGroup } from "./content.group.js";
import { CalculatorRpcExpectedError } from "./errors.js";
import {
  CalculatorCatalogRpcPayload,
  CalculatorDescriptorRpcPayload,
  CalculatorDiscoveryRpcPayload,
  CalculatorGraphRpcPayload,
  CalculatorMetadataRpcPayload,
  CalculatorRpcPayload,
  CalculatorRpcSafeDefect,
} from "./schemas.js";

export class Calculate extends Rpc.make("Calculate", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorRpcPayload,
  success: CalculatorRunResponse,
}) {}

export class GetCalculator extends Rpc.make("GetCalculator", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorMetadataRpcPayload,
  success: CalculatorCatalogItem,
}) {}

export class GetCalculatorGraph extends Rpc.make("GetCalculatorGraph", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorGraphRpcPayload,
  success: CalculatorGraphResponse,
}) {}

export class GetCalculatorSchema extends Rpc.make("GetCalculatorSchema", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorMetadataRpcPayload,
  success: CalculatorSchemaResponse,
}) {}

export class ListCalculators extends Rpc.make("ListCalculators", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorCatalogRpcPayload,
  success: CalculatorCatalogResponse,
}) {}

export class ListFacts extends Rpc.make("ListFacts", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorDescriptorRpcPayload,
  success: FactsResponse,
}) {}

export class ListJurisdictions extends Rpc.make("ListJurisdictions", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorDiscoveryRpcPayload,
  success: JurisdictionsResponse,
}) {}

export class ListRules extends Rpc.make("ListRules", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorDescriptorRpcPayload,
  success: RulesResponse,
}) {}

export class ListTaxYears extends Rpc.make("ListTaxYears", {
  defect: CalculatorRpcSafeDefect,
  error: CalculatorRpcExpectedError,
  payload: CalculatorCatalogRpcPayload,
  success: TaxYearsResponse,
}) {}

export const TaxKitRpcGroup = RpcGroup.make(
  Calculate,
  GetCalculator,
  GetCalculatorGraph,
  GetCalculatorSchema,
  ListCalculators,
  ListFacts,
  ListJurisdictions,
  ListRules,
  ListTaxYears
);

export const TaxKitPublicRpcGroup = TaxKitRpcGroup.merge(DocsRpcGroup);
