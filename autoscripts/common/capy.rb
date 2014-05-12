require 'capybara/dsl'
require 'rspec'
include RSpec::Matchers

require 'selenium-webdriver'

USER_AGENT = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
  galaxy_s3: 'Mozilla/5.0 (Linux; U; Android 4.0.4; en-gb; GT-I9300 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
}

Capybara.default_driver = :selenium_ff

def seleniumFrFF(win_ip)
  @winUrl = 'http://' + win_ip + '/wd/hub'
  Capybara.register_driver :selenium_ff do |app|
    capabilities = Selenium::WebDriver::Remote::Capabilities.firefox(get_platform_and_version)
    Capybara::Selenium::Driver.new app, browser: :remote, desired_capabilities: capabilities, url: @winUrl
  end
  Capybara.default_driver = :selenium_ff
end

def seleniumFriPhone(win_ip)
  @winUrl = 'http://' + win_ip + '/wd/hub'
  Capybara.register_driver :selenium_iphone do |app|
    capabilities = Selenium::WebDriver::Remote::Capabilities.iphone
    Capybara::Selenium::Driver.new app, browser: :remote, desired_capabilities: capabilities, url: @winUrl
  end
  Capybara.default_driver = :selenium_iphone
end

def seleniumFrGC(win_ip, options = {})
  @winUrl = 'http://' + win_ip + '/wd/hub'
  Capybara.register_driver :selenium_chrome do |app|
    capabilities = Selenium::WebDriver::Remote::Capabilities.chrome(get_platform_and_version.merge('chromeOptions' => { 'args' => get_chrome_arguments(options)}))
    Capybara::Selenium::Driver.new app, browser: :remote, desired_capabilities: capabilities, url: @winUrl
  end
  Capybara.default_driver = :selenium_chrome
end

def seleniumFrIE(win_ip)
  @winUrl = 'http://' + win_ip + '/wd/hub'
  Capybara.register_driver :selenium_ie do |app|
    capabilities = Selenium::WebDriver::Remote::Capabilities.internet_explorer(get_platform_and_version)
    Capybara::Selenium::Driver.new app, browser: :remote, desired_capabilities: capabilities, url: @winUrl
  end
  Capybara.default_driver = :selenium_ie
end

def seleniumFrSAF(win_ip)
  @winUrl = 'http://' + win_ip + '/wd/hub'
  Capybara.register_driver :selenium_safari do |app|
    capabilities = Selenium::WebDriver::Remote::Capabilities.safari(get_platform_and_version)
    Capybara::Selenium::Driver.new app, browser: :remote, desired_capabilities: capabilities, url: @winUrl
  end
  Capybara.default_driver = :selenium_safari
  Capybara.current_session.driver.browser.manage.timeouts.implicit_wait = 3
end

def get_platform_and_version
  options = {}
  options[:platform] = 'WINDOWS' if /^w/i.match(@objParams['platform'])
  options[:platform] = 'MAC' if /^m/i.match(@objParams['platform'])
  options[:platform] = 'LINUX' if /^l/i.match(@objParams['platform'])
  options[:version] = @objParams['version'] unless @objParams['version'].nil?
  options
end

def get_chrome_arguments(options)

  if @objParams['user_agent'].nil?
    args = []
  elsif USER_AGENT.has_key?(@objParams['user_agent'].to_sym)
    args = [ "--user-agent='#{USER_AGENT[@objParams['user_agent'].to_sym]}'" ]
  else
    raise "Unknown user agent:  #{@objParams['user_agent']}"
  end

  if options['use_chrome_extension']
    args << "--apps-gallery-install-auto-confirm-for-tests=accept"
#   args << "--load-extension=" + (@objParams['extension_path'] || "Z:\\VMShare\\Resources\\SMaChromeApp")
  end

  args

end

def parseArgs(args)
  @obj={}
  args.each do |a|
    @obj[a.split('=')[0]] = a.split('=')[1];
  end
  return @obj
end

$testState = {}

def _runTest(fnTest, opt={})
  begin

    warn_level = $VERBOSE
    $VERBOSE = nil
    include Capybara::DSL
    $VERBOSE = warn_level

    ENV['no_proxy'] = 'localhost'; #for local testing

    @objParams = parseArgs(ARGV)

    if @objParams["browser"] == 'FF' then
      seleniumFrFF(@objParams["remoteAddress"])
    elsif @objParams["browser"] == 'GC' then
      seleniumFrGC(@objParams["remoteAddress"], opt)
    elsif @objParams["browser"] == 'SAF' then
      seleniumFrSAF(@objParams["remoteAddress"])
    elsif @objParams["browser"] == 'IPHONE' then
      seleniumFriPhone(@objParams["remoteAddress"])
    else
      seleniumFrIE(@objParams["remoteAddress"])
    end

    $testState['browser'] = @objParams["browser"];

    @url = @objParams["testServer"]

    browser = Capybara.current_session.driver.browser
    Capybara.default_wait_time = opt['waitTime'] || 30
    browser.manage.delete_all_cookies
    browser.manage.window.resize_to(opt['xRes'] || 1800, opt['yRes'] || 1000)
    visit @url

    fnTest.call(@objParams)

    # if it was using step
    if $testState['curStep'] then
      puts 'Ok'
    end

    puts "Test Passed";
  rescue Exception => e
    $stderr.puts e.message + "\n" + e.backtrace.inspect
    begin
      page.execute_script("window.onbeforeunload = null;")
      if @objParams["reportDir"] && @objParams["testName"] then
        filename =  "#{@objParams['reportDir']}#{@objParams['testName']}.png"
        page.save_screenshot(filename)
        $stderr.puts "Screenshot saved:  #{filename}"
      end
    rescue  Exception => e
      $stderr.puts "Screenshot error:  #{e.message}"
    end
    abort('Test failed')
  end
end

def step(msg, &block)
  if $testState['curStep'] then
    puts 'Ok'
  end

  print msg + ': '
  STDOUT.flush

  $testState['curStep'] = msg

  if(block) then
    page.using_wait_time Capybara.default_wait_time do
      expect(page).to block.call()
    end
  end

  if($testState["browser"] == 'SAF' && $testState['url'] && $testState['url'] == page.current_url()) then
    sleep(3)
  end
  $testState['url'] = page.current_url();
end
