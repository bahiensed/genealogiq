'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { companyResolver, companyDefaultValues, type CompanyFormValues } from '@/schemas/company.schema'
import { maskCnpj, maskPhone } from '@/lib/masks'
import { PHONE_COUNTRY_CODES } from '@/constants/phone-country-codes'
import { SetupSchema } from '@/lib/auth'
import { setupSystem } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MaskedInput } from '@/components/ui/masked-input'
import { AddressSection } from '@/components/address/address-section'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import type { z } from 'zod'

type AdminFormValues = z.infer<typeof SetupSchema>

const TOTAL_STEPS = 4

const STEP_LABELS = [
  'Dados da empresa',
  'Endereço da empresa',
  'Dados do administrador',
  'Acesso ao sistema',
]

export function SetupWizard() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [companyData, setCompanyData] = useState<CompanyFormValues | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const companyForm = useForm<CompanyFormValues>({
    resolver: companyResolver,
    defaultValues: companyDefaultValues,
  })

  const adminForm = useForm<AdminFormValues>({
    resolver: zodResolver(SetupSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  })

  async function handleStep1() {
    const valid = await companyForm.trigger([
      'legalName', 'tradeName', 'taxId', 'email', 'phoneCountryCode', 'phone',
    ])
    if (valid) setStep(2)
  }

  function handleStep2Skip() {
    setStep(3)
  }

  async function handleStep2Next() {
    setStep(3)
  }

  async function handleStep3() {
    const valid = await adminForm.trigger(['firstName', 'lastName'])
    if (valid) setStep(4)
  }

  async function onFinalSubmit(adminData: AdminFormValues) {
    setServerError(null)
    const company = companyForm.getValues()
    const result = await setupSystem(company, adminData)
    if (result?.error) setServerError(result.error)
  }

  const { control: cc, formState: { errors: ce } } = companyForm
  const { control: ac, handleSubmit: handleAdminSubmit, formState: { isSubmitting } } = adminForm

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Configuração inicial</CardTitle>
        <CardDescription>
          Passo {step} de {TOTAL_STEPS} — {STEP_LABELS[step - 1]}
        </CardDescription>
        <Progress value={(step / TOTAL_STEPS) * 100} className="mt-1" />
      </CardHeader>

      {/* Step 1 — Company Info */}
      {step === 1 && (
        <div>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="legalName"
                  control={cc}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Razão Social:</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="tradeName"
                  control={cc}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Nome Fantasia:</FieldLabel>
                      <Input {...field} autoComplete="off" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="taxId"
                control={cc}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>CNPJ:</FieldLabel>
                    <MaskedInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      maskFn={maskCnpj}
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="stateRegistration"
                  control={cc}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Inscrição Estadual:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />

                <Controller
                  name="municipalRegistration"
                  control={cc}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Inscrição Municipal:</FieldLabel>
                      <Input {...field} value={field.value ?? ''} autoComplete="off" />
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="email"
                control={cc}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>E-mail da empresa:</FieldLabel>
                    <Input {...field} type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="grid grid-cols-12 gap-3">
                <Controller
                  name="phoneCountryCode"
                  control={cc}
                  render={({ field }) => (
                    <Field className="col-span-2">
                      <FieldLabel>DDI:</FieldLabel>
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
                  control={cc}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-4" data-invalid={fieldState.invalid}>
                      <FieldLabel>Telefone:</FieldLabel>
                      <MaskedInput
                        value={field.value ?? ''}
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
            </FieldGroup>
          </CardContent>

          <CardFooter className="mt-2">
            <Button type="button" className="w-full" onClick={handleStep1}>
              Próximo →
            </Button>
          </CardFooter>
        </div>
      )}

      {/* Step 2 — Company Address */}
      {step === 2 && (
        <div>
          <CardContent>
            <AddressSection
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              control={cc as any}
              setValue={companyForm.setValue}
              errors={ce}
              prefix="address"
            />
          </CardContent>

          <CardFooter className="mt-2 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              ← Voltar
            </Button>
            <Button type="button" variant="ghost" onClick={handleStep2Skip} className="ml-auto">
              Pular
            </Button>
            <Button type="button" onClick={handleStep2Next}>
              Próximo →
            </Button>
          </CardFooter>
        </div>
      )}

      {/* Step 3 — Admin Personal */}
      {step === 3 && (
        <div>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="firstName"
                  control={ac}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Nome:</FieldLabel>
                      <Input {...field} autoComplete="given-name" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="lastName"
                  control={ac}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Sobrenome:</FieldLabel>
                      <Input {...field} autoComplete="family-name" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </FieldGroup>
          </CardContent>

          <CardFooter className="mt-2 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              ← Voltar
            </Button>
            <Button type="button" className="flex-1" onClick={handleStep3}>
              Próximo →
            </Button>
          </CardFooter>
        </div>
      )}

      {/* Step 4 — Admin Access */}
      {step === 4 && (
        <form onSubmit={adminForm.handleSubmit(onFinalSubmit)}>
          <CardContent>
            {serverError && <FieldError className="mb-4">{serverError}</FieldError>}

            <FieldGroup>
              <Controller
                name="email"
                control={ac}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>E-mail do administrador:</FieldLabel>
                    <Input {...field} type="email" autoComplete="email" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={ac}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Senha:</FieldLabel>
                    <InputGroup aria-invalid={fieldState.invalid}>
                      <InputGroupInput
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        aria-invalid={fieldState.invalid}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? <EyeOff /> : <Eye />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>

          <CardFooter className="mt-2 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(3)} disabled={isSubmitting}>
              ← Voltar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Configurando…' : 'Concluir'}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
