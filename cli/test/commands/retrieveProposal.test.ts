import {expect, test} from '@oclif/test'

describe('retrieveProposal', () => {
  test
  .stdout()
  .command(['retrieveProposal'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['retrieveProposal', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
