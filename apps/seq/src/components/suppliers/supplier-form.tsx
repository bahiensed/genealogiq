'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { supplierResolver, supplierDefaultValues, type SupplierFormValues } from '@/schemas/supplier.schema'
import { createSupplier, updateSupplier } from '@/actions/supplier.actions'
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@genealogiq/ui/field'

interface Category {
  id: string
  name: string
}

interface SupplierFormProps {
  id?: string
  defaultValues?: SupplierFormValues
  categories?: Category[]
}

export function SupplierForm({ id, defaultValues, categories = [] }: SupplierFormProps) {
  const isEditing = !!id
  const [serverError, setServerError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<SupplierFormValues>({
    resolver: supplierResolver,
    defaultValues: defaultValues ?? supplierDefaultValues,
  })

  const { control, handleSubmit, setValue, formState: { isSubmitting, errors } } = form

  const entityType = useWatch({ control, name: 'entityType' })
  const isIndividual = entityType === 'INDIVIDUAL'

  async function onSubmit(data: SupplierFormValues) {
    setServerError(null)
    const result = isEditing ? await updateSupplier(id, data) : await createSupplier(data)
    if ('error' in result) {
      setServerError(result.error)
    } else {
      toast.success(result.success)
      if (!isEditing) router.push('/suppliers')
    }
  }

  function scrollToFirstError() {
    requestAnimationFrame(() => {
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, scrollToFirstError)} className="flex flex-col gap-6 max-w-2xl">

      <FieldGroup>
        {/* Tipo */}
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="entityType"
            control={control}
            render={({ field }) => (
              <Field className="col-span-4">
                <FieldLabel>Type:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">Company</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>

        {/* Primary name + Secondary name (labels change by type) */}
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>{isIndividual ? 'Name:' : 'Company Name:'}</FieldLabel>
                <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="tradeName"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>{isIndividual ? 'Last Name:' : 'Trade Name:'}</FieldLabel>
                <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {/* Tax ID + type-specific fields */}
        {isIndividual ? (
          <div className="grid grid-cols-12 gap-3">
            <Controller
              name="taxId"
              control={control}
              render={({ field, fieldState }) => (
                <Field className="col-span-6" data-invalid={fieldState.invalid}>
                  <FieldLabel>CPF:</FieldLabel>
                  <MaskedInput
                    value={field.value}
                    onChange={field.onChange}
                    maskFn={maskCpf}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="birthDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field className="col-span-6" data-invalid={fieldState.invalid}>
                  <FieldLabel>Date of Birth:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} type="date" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3">
            <Controller
              name="taxId"
              control={control}
              render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>CNPJ:</FieldLabel>
                  <MaskedInput
                    value={field.value}
                    onChange={field.onChange}
                    maskFn={maskCnpj}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="stateRegistration"
              control={control}
              render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>State Registration:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="municipalRegistration"
              control={control}
              render={({ field, fieldState }) => (
                <Field className="col-span-4" data-invalid={fieldState.invalid}>
                  <FieldLabel>Municipal Registration:</FieldLabel>
                  <Input {...field} value={field.value ?? ''} autoComplete="off" aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        )}

        {/* E-mail + DDI + Telefone */}
        <div className="grid grid-cols-12 gap-3">
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-6" data-invalid={fieldState.invalid}>
                <FieldLabel>E-mail:</FieldLabel>
                <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="phoneCountryCode"
            control={control}
            render={({ field }) => (
              <Field className="col-span-2">
                <FieldLabel>Country Code:</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHONE_COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <Field className="col-span-4" data-invalid={fieldState.invalid}>
                <FieldLabel>Phone:</FieldLabel>
                <MaskedInput
                  value={field.value}
                  onChange={field.onChange}
                  maskFn={maskPhone}
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        {/* Categoria */}
        <Controller
          name="categoryId"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Category:</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-invalid={fieldState.invalid}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Notas */}
        <Controller
          name="notes"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Notes:</FieldLabel>
              <Textarea {...field} value={field.value ?? ''} rows={3} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {isEditing && (
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
                <FieldLabel htmlFor="isActive" className="cursor-pointer">Active supplier:</FieldLabel>
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <FieldSeparator />

      <p className="text-sm font-medium">Address</p>
      <AddressSection
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        setValue={setValue}
        errors={errors}
        prefix="address"
      />

      {serverError && <FieldError>{serverError}</FieldError>}

      <Field orientation="horizontal">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create supplier'}
        </Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>
          Reset
        </Button>
      </Field>
    </form>
  )
}
