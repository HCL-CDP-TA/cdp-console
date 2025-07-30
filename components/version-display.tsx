"use client"

interface VersionDisplayProps {
  isCollapsed?: boolean
}

export const VersionDisplay = ({ isCollapsed = false }: VersionDisplayProps) => {
  // Use require to dynamically load package.json
  let version = "1.0.0"
  try {
    const packageInfo = require("../package.json")
    version = packageInfo.version
  } catch (error) {
    console.warn("Could not load package.json version")
  }

  return (
    <div
      className={`
      ${isCollapsed ? "text-center" : "text-center"} 
      transition-all duration-300
    `}>
      <div className="text-xs text-gray-500">{isCollapsed ? `v${version}` : `Version ${version}`}</div>
    </div>
  )
}

export default VersionDisplay
