import { FormatNumberOptions, MessageDescriptor } from '@formatjs/intl/src/types'
import { FormatXMLElementFn, PrimitiveType } from 'intl-messageformat'
import { Options as IntlMessageFormatOptions } from 'intl-messageformat/src/core'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $formatMessage: (descriptor: MessageDescriptor, values?: Record<string, PrimitiveType | FormatXMLElementFn<string, string>>, opts?: IntlMessageFormatOptions) => string
    $formatNumber: (value?: Parameters<Intl.NumberFormat['format']>[0], opts?: FormatNumberOptions) => string
  }
}
