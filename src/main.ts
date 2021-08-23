import {extract, findPackageJson} from './util'
import {getInput, info, setFailed, setOutput} from '@actions/core'
import {context} from '@actions/github'

function checkStableVersionBranch(): boolean {
  return context.ref === 'refs/heads/master'
}

function createStablePackage(version: string): string {
  if (/^(\d+.\d+.\d+)$/.test(version)) {
    info('Hotfix package flow')

    return version.replace(
      /^(\d+.\d+.)(\d+)$/,
      (_, start, patch) => start + (parseInt(patch) + 1)
    )
  }

  info('Stable package flow')

  return version.replace(/-rc.\d+$/, '')
}

function createReleaseCandidatePackage(version: string): string {
  if (/^(\d+.\d+.\d+)$/.test(version)) {
    info('RC package flow, first increment')

    return version.replace(
      /^(\d+.)(\d+)/,
      (_, start, minor) => `${start + (parseInt(minor) + 1)}.0-rc.0`
    )
  }

  info('RC package flow, not first increment')

  return version.replace(
    /^(\d+.\d+.\d+-rc.)(\d+)$/,
    (_, start, release) => start + (parseInt(release) + 1)
  )
}

async function run(): Promise<void> {
  try {
    const followSymbolicLinks: boolean =
      getInput('follow-symlinks').toLowerCase() !== 'false'
    const path: string = getInput('path')
      ? `${process.env.GITHUB_WORKSPACE}/${getInput('path')}`
      : await findPackageJson(followSymbolicLinks)

    const packageVersion: string = await extract(path)
    info(`Old version${packageVersion}`)

    const newPackageVersion = checkStableVersionBranch()
      ? createStablePackage(packageVersion)
      : createReleaseCandidatePackage(packageVersion)
    info(`New version${newPackageVersion}`)

    setOutput('next-version', newPackageVersion)
  } catch (error) {
    setFailed(error.message)
  }
}

run()
