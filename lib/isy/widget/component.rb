module Isy
  module Widget

    # Abstract class of widgets used to render components
    class Component < Base

      # component to be rendered
      attr_reader :component

      # @param [Component::Base] component to be rendered
      def initialize(component)
        @component = component
      end

      # renders link with +label+ to some action +action+ which is executed after click on the link
      # @param [String] label text of the link
      # @yield action block of code which will be evaluated inside {#component} after click on the link
      def link_to(label, &action)
        uuid = register_action(&action)
        a label, :href => "?context_id=#{component.context.id}&action_id=#{uuid}"
      end

      private

      # registers action to {#component} for later evaluation
      # @yield action block to register
      def register_action(&block)
        component.context.register_action(component, &block)
      end

    end
  end
end