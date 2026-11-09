import Icon from './Icon.jsx'

export default function Button({
  children,
  variant = 'yellow',
  icon = 'arrow',
  className = '',
  ...props
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
      {icon && <Icon name={icon} size={18} />}
    </button>
  )
}
