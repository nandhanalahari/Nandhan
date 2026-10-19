import { createContext, useContext } from 'react'

export const BootContext = createContext(true)

export const useBooted = () => useContext(BootContext)
