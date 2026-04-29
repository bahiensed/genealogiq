'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { CheckIcon } from 'lucide-react'
import {
  customerCreateResolver,
  customerCreateDefaultValues,
  type CustomerCreateFormValues,
} from '@/schemas/customer.schema'
import { createCustomer } from '@/actions/customer.actions'
import { maskCpf, maskCnpj, maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { cn } from '@/lib/utils'

interface Category { id: string; name: string }
interface Props { categories?: Category[] }

const STEPS = [
  { title: 'Business',       desc: 'Legal info & identification' },
  { title: 'Contact',        desc: 'Contact details & category'  },
  { title: 'Address',        desc: 'Physical location'           },
  { title: 'Administrator',  desc: 'Sequoia account owner'       },
  { title: 'Modules',        desc: 'Sequoia access permissions'  },
]

type StepIndex = 0 | 1 | 2 | 3 | 4

const STEP_FIELDS: Record<StepIndex, (keyof CustomerCreateFormValues | string)[]> = {
  0: ['entityType', 'name', 'tradeName', 'taxId', 'stateRegistration', 'municipalRegistration', 'birthDate'],
  1: ['email', 'phoneCountryCode', 'phone', 'categoryId'],
  2: [],
  3: ['owner.firstName', 'owner.lastName', 'owner.email'],
  4: [],
}

export function CustomerNewForm({ categories = [] }: Props) {
  const [step, setStep]                 = useState<StepIndex>(0)
  const [localCategories, setLocalCats] = useState(categories)
  const [serverError, setServerError]   = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<CustomerCreateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver:      customerCreateResolver as any,
    defaultValues: customerCreateDefaultValues,
    mode:          'onTouched',
  })

  const { control, handleSubmit, setValue, trigger, formState: { isSubmitting, errors } } = form

  const entityType = useWatch({ control, name: 'entityType' })
  const isIndividual = entityType === 'INDIVIDUAL'

  async function goNext() {
    const fields = STEP_FIELDS[step]
    if (fields.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ok = await trigger(fields as any)
      if (!ok) return
    }
    setStep((s) => (s + 1) as StepIndex)
  }

  function goBack() {
    setStep((s) => (s - 1) as StepIndex)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    data = data as CustomerCreateFormValues
    setServerError(null)
    const result = await createCustomer(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      router.push('/customers')
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-screen-lg mx-auto">
      {/* Header */}
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        New customer
      </h1>

      {/* Stepper */}
      <nav aria-label="Form steps">
        {/* Mobile: compact numbered steps */}
        <div className="flex items-center gap-2 md:hidden">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors',
                i < step  && 'bg-primary text-primary-foreground',
                i === step && 'ring-2 ring-primary bg-primary/10 text-primary',
                i > step  && 'bg-muted text-muted-foreground',
              )}>
                {i < step ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-4 shrink-0', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
          <span className="ml-2 text-sm font-medium">{STEPS[step].title}</span>
          <span className="text-xs text-muted-foreground ml-1">— {STEPS[step].desc}</span>
        </div>

        {/* Desktop: full stepper */}
        <ol className="hidden md:flex items-start gap-0">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start flex-1 min-w-0">
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    i < step  && 'bg-primary text-primary-foreground',
                    i === step && 'ring-2 ring-primary ring-offset-2 bg-primary/10 text-primary',
                    i > step  && 'bg-muted text-muted-foreground',
                  )}>
                    {i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('h-px flex-1 mx-3 mt-0', i < step ? 'bg-primary' : 'bg-border')} />
                  )}
                </div>
                <div className="mt-2 pr-4">
                  <p className={cn('text-sm font-semibold', i === step ? 'text-foreground' : 'text-muted-foreground')}>{s.title}</p>
                  <p className="text-xs text-muted-foreground hidden lg:block">{s.desc}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step content */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

        {/* ── Step 0: Business ── */}
        {step === 0 && (
          <div className="flex flex-col gap-6">
            <FieldGroup>
              {/* Type */}
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

              {/* Name + Trade name */}
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

              {/* Tax ID + extra fields */}
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
          </div>
        )}

        {/* ── Step 1: Contact ── */}
        {step === 1 && (
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
        )}

        {/* ── Step 2: Address ── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Address is optional and can be filled in later.</p>
            <AddressSection
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              control={control as any}
              setValue={setValue}
              errors={errors}
              prefix="address"
            />
          </div>
        )}

        {/* ── Step 3: Administrator ── */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Access credentials for the Sequoia system for the person responsible for this company.
                An email will be sent with a link to set the password.
              </p>
            </div>
            <FieldGroup>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller name="owner.firstName" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>First Name:</FieldLabel>
                    <Input {...field} autoComplete="given-name" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
                <Controller name="owner.lastName" control={control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Last Name:</FieldLabel>
                    <Input {...field} autoComplete="family-name" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </div>
              <Controller name="owner.email" control={control} render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Email:</FieldLabel>
                  <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </FieldGroup>
          </div>
        )}

        {/* ── Step 4: Modules ── */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Items shown in gray are always accessible and cannot be disabled.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {/* Always-on */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Always active</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Dashboard', 'Buy Licenses', 'View Licenses', 'Customers', 'Sales', 'System'].map((label) => (
                    <label key={label} className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                      <Checkbox checked disabled />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Records */}
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

              {/* Categories */}
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

              {/* Purchasing */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Purchasing</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    Buy Licenses
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

              {/* Inventory */}
              <div className="flex flex-col gap-3">
                <p className="text-sm font-semibold">Inventory</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm opacity-50 cursor-not-allowed select-none">
                    <Checkbox checked disabled />
                    View Licenses
                  </label>
                  <Controller name="moduleInventoryProducts" control={control} render={({ field }) => (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      Products
                    </label>
                  )} />
                </div>
              </div>

              {/* Finance */}
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
          </div>
        )}

        {/* Server error */}
        {serverError && <FieldError>{serverError}</FieldError>}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
          >
            Back
          </Button>

          <span className="text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create customer'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
