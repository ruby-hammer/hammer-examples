# encoding: UTF-8

module Hammer::Widget::Component

  def self.included(base)
    base.class_eval do
      needs :component
      attr_reader :component
    end
  end

  # automatically passes :component assign to child widgets
  def widget(target, assigns = {}, options = {}, &block)
    assigns.merge!(:component => @component) {|_,old,_| old } if target.is_a? Class
    super target, assigns, options, &block
  end

  def a(*args, &block)
    super *args.push(args.extract_options!.merge(:href => '#')), &block
  end

  # calls missing methods on component
  def method_missing(method, *args, &block)
    if component.respond_to?(method)
      component.__send__ method, *args, &block
    else
      super
    end
  end

  def respond_to?(symbol, include_private = false)
    component.respond_to?(symbol) || super
  end
  
  private

  # registers action to #component for later evaluation
  # @yield action block to register
  # @return [String] uuid of the action
  def register_action(&block)
    component.context.register_action(component, &block)
  end
end