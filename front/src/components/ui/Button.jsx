import Icon from './Icon.jsx'

export default function Button({
  children,
  variant = 'yellow',
  icon = 'arrow',
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button type={type} className={`button button-${variant} ${className}`} {...props}>
      {children}
      {icon && <Icon name={icon} size={18} />}
    </button>
  )
}
