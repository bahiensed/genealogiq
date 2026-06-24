'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  customerResolver,
  customerDefaultValues,
  type CustomerFormValues,
} from '@/schemas/customer.schema'
import { updateCustomer } from '@/actions/customer.actions'
import { maskCpf, maskCnpj, maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@genealogiq/ui/button'
import { Input } from '@genealogiq/ui/input'
import { Textarea } from '@genealogiq/ui/textarea'
import { Switch } from '@genealogiq/ui/switch'
import { MaskedInput } from '@genealogiq/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@genealogiq/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@genealogiq/ui/field'
import { AddCustomerCategoryDialog } from '@/components/customers/add-customer-category-dialog'
import { Checkbox } from '@genealogiq/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@genealogiq/ui/accordion'

interface Category { id: string; name: string }

interface CustomerFormProps {
  id: string
  defaultValues?: CustomerFormValues
  categories?: Category[]
}

const ALWAYS_ACTIVE = ['dashboard', 'buySubscriptions', 'viewSubscriptions', 'customers', 'sales', 'system'] as const
const RECORDS_MODULES = [
  { name: 'moduleRecordsSuppliers', labelKey: 'suppliers' },
  { name: 'moduleRecordsProducts',  labelKey: 'products'  },
  { name: 'moduleRecordsServices',  labelKey: 'services'  },
] as const
const CATEGORY_MODULES = [
  { name: 'moduleCategoriesSuppliers', labelKey: 'supplierCat' },
  { name: 'moduleCategoriesProducts',  labelKey: 'productCat'  },
  { name: 'moduleCategoriesServices',  labelKey: 'serviceCat'  },
] as const
const PURCHASING_MODULES = [
  { name: 'modulePurchasingProducts', labelKey: 'products' },
  { name: 'modulePurchasingServices', labelKey: 'services' },
] as const

export function CustomerForm({ id, defaultValues, categories = [] }: CustomerFormProps) {
  const t  = useTranslations('Customers')
  const tc = useTranslations('Common')
  const [serverError, setServerError]   = useState<string | null>(null)
  const [localCategories, setLocalCats] = useState(categories)
  const router = useRouter()

  const form = useForm<CustomerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver:      customerResolver as any,
    defaultValues: defaultValues ?? customerDefaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  const entityType  = useWatch({ control, name: 'entityType' })
  const isIndividual = entityType === 'INDIVIDUAL'

  async function onSubmit(data: CustomerFormValues) {
    setServerError(null)
    const result = await updateCustomer(id, data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
          {t('edit')}
        </h1>
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
              <label htmlFor="isActive" className="text-sm cursor-pointer">{t('active')}</label>
            </div>
          )}
        />
      </div>

      <Accordion type="multiple" defaultValue={['business']} className="flex flex-col gap-2">

        {/* ── Business ── */}
        <AccordionItem value="business" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.business')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name="entityType"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>{t('fields.type')}</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPANY">{t('entityType.company')}</SelectItem>
                          <SelectItem value="INDIVIDUAL">{t('entityType.individual')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller name="name" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{isIndividual ? t('fields.firstName') : t('fields.companyName')}</FieldLabel>
                    <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="tradeName" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{isIndividual ? t('fields.lastName') : t('fields.tradeName')}</FieldLabel>
                    <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              {isIndividual ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller name="taxId" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.cpf')}</FieldLabel>
                      <MaskedInput value={field.value} onChange={field.onChange} maskFn={maskCpf} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="birthDate" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.birthDate')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Controller name="taxId" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.cnpj')}</FieldLabel>
                      <MaskedInput value={field.value} onChange={field.onChange} maskFn={maskCnpj} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="stateRegistration" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.stateRegistration')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="municipalRegistration" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>{t('fields.municipalRegistration')}</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                </div>
              )}
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Contact ── */}
        <AccordionItem value="contact" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.contact')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <Controller name="email" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('fields.email')}</FieldLabel>
                  <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller name="phoneCountryCode" control={control} render={({ field }) => (
                  <Field>
                    <FieldLabel>{t('fields.countryCode')}</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PHONE_COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )} />
                <Controller name="phone" control={control} render={({ field, fieldState }) => (
                  <Field className="md:col-span-2" data-invalid={fieldState.invalid}>
                    <FieldLabel>{t('fields.phone')}</FieldLabel>
                    <MaskedInput value={field.value} onChange={field.onChange} maskFn={maskPhone} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="categoryId" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel>{t('fields.category')}</FieldLabel>
                    <AddCustomerCategoryDialog onCreated={(cat) => {
                      setLocalCats(prev => [...prev, cat])
                      field.onChange(cat.id)
                    }} />
                  </div>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder={t('placeholders.category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {localCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <Controller name="notes" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>{t('fields.notes')}</FieldLabel>
                  <Textarea {...field} value={field.value ?? ''} rows={3} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Address ── */}
        <AccordionItem value="address" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.address')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <AddressSection
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              control={control as any}
              setValue={setValue}
              errors={errors}
              prefix="address"
            />
          </AccordionContent>
        </AccordionItem>

        {/* ── Modules ── */}
        <AccordionItem value="modules" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">{t('sections.modules')}</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{t('modules.groups.alwaysActive')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALWAYS_ACTIVE.map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                      <Checkbox checked disabled />
                      {t(`modules.labels.${k}`)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{t('modules.groups.records')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {RECORDS_MODULES.map(({ name, labelKey }) => (
                    <Controller key={name} name={name} control={control} render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        {t(`modules.labels.${labelKey}`)}
                      </label>
                    )} />
                  ))}
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    {t('modules.labels.customers')}
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{t('modules.groups.categories')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_MODULES.map(({ name, labelKey }) => (
                    <Controller key={name} name={name} control={control} render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        {t(`modules.labels.${labelKey}`)}
                      </label>
                    )} />
                  ))}
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    {t('modules.labels.customerCat')}
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{t('modules.groups.purchasing')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    {t('modules.labels.buySubscriptions')}
                  </label>
                  {PURCHASING_MODULES.map(({ name, labelKey }) => (
                    <Controller key={name} name={name} control={control} render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        {t(`modules.labels.${labelKey}`)}
                      </label>
                    )} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{t('modules.groups.inventory')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    {t('modules.labels.viewSubscriptions')}
                  </label>
                  <Controller name="moduleInventoryProducts" control={control} render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      {t('modules.labels.products')}
                    </label>
                  )} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">{t('modules.groups.finance')}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Controller name="moduleFinance" control={control} render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      {t('modules.labels.finance')}
                    </label>
                  )} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      {serverError && <FieldError>{serverError}</FieldError>}
      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? tc('saving') : tc('save')}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          {tc('reset')}
        </Button>
      </Field>
    </form>
  )
}
