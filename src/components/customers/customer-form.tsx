'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import {
  customerResolver,
  customerDefaultValues,
  type CustomerFormValues,
} from '@/schemas/customer.schema'
import { updateCustomer } from '@/actions/customer.actions'
import { maskCpf, maskCnpj, maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MaskedInput } from '@/components/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { AddCustomerCategoryDialog } from '@/components/customers/add-customer-category-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface Category { id: string; name: string }

interface CustomerFormProps {
  id: string
  defaultValues?: CustomerFormValues
  categories?: Category[]
}

export function CustomerForm({ id, defaultValues, categories = [] }: CustomerFormProps) {
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
          Edit customer
        </h1>
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
              <label htmlFor="isActive" className="text-sm cursor-pointer">Active?</label>
            </div>
          )}
        />
      </div>

      <Accordion type="multiple" defaultValue={['business']} className="flex flex-col gap-2">

        {/* ── Business ── */}
        <AccordionItem value="business" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Business</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name="entityType"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Type:</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COMPANY">Company</SelectItem>
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller name="name" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{isIndividual ? 'First Name:' : 'Company Name:'}</FieldLabel>
                    <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="tradeName" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>{isIndividual ? 'Last Name:' : 'Trade Name:'}</FieldLabel>
                    <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              {isIndividual ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller name="taxId" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>CPF:</FieldLabel>
                      <MaskedInput value={field.value} onChange={field.onChange} maskFn={maskCpf} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="birthDate" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Date of Birth:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Controller name="taxId" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>CNPJ:</FieldLabel>
                      <MaskedInput value={field.value} onChange={field.onChange} maskFn={maskCnpj} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="stateRegistration" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>State Reg.:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )} />
                  <Controller name="municipalRegistration" control={control} render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Municipal Reg.:</FieldLabel>
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
          <AccordionTrigger className="text-base font-semibold">Contact</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <FieldGroup>
              <Controller name="email" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email:</FieldLabel>
                  <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller name="phoneCountryCode" control={control} render={({ field }) => (
                  <Field>
                    <FieldLabel>Country Code:</FieldLabel>
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
                    <FieldLabel>Phone:</FieldLabel>
                    <MaskedInput value={field.value} onChange={field.onChange} maskFn={maskPhone} autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>

              <Controller name="categoryId" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex items-center justify-between">
                    <FieldLabel>Category:</FieldLabel>
                    <AddCustomerCategoryDialog onCreated={(cat) => {
                      setLocalCats(prev => [...prev, cat])
                      field.onChange(cat.id)
                    }} />
                  </div>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-invalid={fieldState.invalid}>
                      <SelectValue placeholder="Select a category" />
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
                  <FieldLabel>Notes:</FieldLabel>
                  <Textarea {...field} value={field.value ?? ''} rows={3} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </FieldGroup>
          </AccordionContent>
        </AccordionItem>

        {/* ── Address ── */}
        <AccordionItem value="address" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">Address</AccordionTrigger>
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
          <AccordionTrigger className="text-base font-semibold">Sequoia Modules</AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Always active</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Dashboard', 'Buy Subscriptions', 'View Subscriptions', 'Customers', 'Sales', 'System'].map((label) => (
                    <label key={label} className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                      <Checkbox checked disabled />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Records</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { name: 'moduleRecordsSuppliers', label: 'Suppliers' },
                    { name: 'moduleRecordsProducts',  label: 'Products'  },
                    { name: 'moduleRecordsServices',  label: 'Services'  },
                  ] as const).map(({ name, label }) => (
                    <Controller key={name} name={name} control={control} render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        {label}
                      </label>
                    )} />
                  ))}
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    Customers
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Categories</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { name: 'moduleCategoriesSuppliers', label: 'Supplier Cat.' },
                    { name: 'moduleCategoriesProducts',  label: 'Product Cat.'  },
                    { name: 'moduleCategoriesServices',  label: 'Service Cat.'  },
                  ] as const).map(({ name, label }) => (
                    <Controller key={name} name={name} control={control} render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        {label}
                      </label>
                    )} />
                  ))}
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    Customer Cat.
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Purchasing</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    Buy Subscriptions
                  </label>
                  {([
                    { name: 'modulePurchasingProducts', label: 'Products' },
                    { name: 'modulePurchasingServices', label: 'Services' },
                  ] as const).map(({ name, label }) => (
                    <Controller key={name} name={name} control={control} render={({ field }) => (
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        {label}
                      </label>
                    )} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Inventory</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    View Subscriptions
                  </label>
                  <Controller name="moduleInventoryProducts" control={control} render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Products
                    </label>
                  )} />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Finance</p>
                <div className="grid grid-cols-2 gap-2">
                  <Controller name="moduleFinance" control={control} render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Finance
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
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
